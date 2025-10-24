
import mysql from 'mysql2/promise';
import { Prescriber } from '../types';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const drug = url.searchParams.get('drug') || '';
  const zip = url.searchParams.get('zip') || '';
  const radius = parseInt(url.searchParams.get('radius') || '20', 10);

  if (!drug || !zip) {
    return new Response(JSON.stringify({ error: 'Drug and ZIP code are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [zipRows]: any = await connection.execute(
      'SELECT latitude, longitude, official_usps_city_name, official_usps_state_code FROM us_zipcodes WHERE zip_code = ?',
      [zip]
    );

    if (zipRows.length === 0) {
      return new Response(JSON.stringify({ error: 'ZIP code not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const search_zip = zipRows[0];

    const sql = `
        SELECT DISTINCT
            nd.npi,
            nd.provider_first_name,
            nd.provider_last_name_legal_name,
            s.specialty_name,
            s.specialty_group,
            na.provider_first_line_business_practice_location_address,
            na.provider_second_line_business_practice_location_address,
            na.provider_business_practice_location_address_city_name,
            na.provider_business_practice_location_address_state_name,
            na.provider_business_practice_location_address_postal_code,
            na.provider_business_practice_location_address_telephone_number,
            d.brand_name,
            d.generic_name,
            d.drug_class,
            d.therapeutic_class,
            d.drug_family,
            COALESCE(d.controlled_substance, 0) as controlled_substance,
            d.controlled_schedule,
            d.route_of_administration,
            np.total_claim_count,
            (
                3959 * acos(
                    cos(radians(?)) * 
                    cos(radians(uz.latitude)) * 
                    cos(radians(uz.longitude) - radians(?)) + 
                    sin(radians(?)) * 
                    sin(radians(uz.latitude))
                )
            ) as distance_miles
        FROM npi_prescriptions np
        JOIN drugs d ON np.drug_id = d.id
        JOIN npi_details nd ON np.npi = nd.npi
        JOIN npi_addresses na ON np.npi = na.npi
        JOIN us_zipcodes uz ON LEFT(na.provider_business_practice_location_address_postal_code, 5) = uz.zip_code
        LEFT JOIN specialties s ON nd.specialty_id = s.id
        WHERE (UPPER(d.generic_name) LIKE UPPER(?) OR UPPER(d.brand_name) LIKE UPPER(?))
          AND na.provider_business_practice_location_address_postal_code IS NOT NULL
          AND LENGTH(na.provider_business_practice_location_address_postal_code) >= 5
        HAVING distance_miles <= ?
        ORDER BY distance_miles, np.total_claim_count DESC
        LIMIT 100
    `;

    const drug_pattern = `%${drug}%`;
    const params = [
        search_zip.latitude,
        search_zip.longitude, 
        search_zip.latitude,
        drug_pattern,
        drug_pattern,
        radius
    ];

    const [results]: any = await connection.execute(sql, params);

    await connection.end();

    const response = {
        search_location: {
            zip: zip,
            city: search_zip.official_usps_city_name,
            state: search_zip.official_usps_state_code
        },
        search_params: {
            drug: drug,
            radius_miles: radius
        },
        results_count: results.length,
        prescribers: results.map((row: any) => ({
            npi: row.npi,
            provider_first_name: row.provider_first_name,
            provider_last_name: row.provider_last_name_legal_name,
            name: `${row.provider_first_name} ${row.provider_last_name_legal_name}`.trim(),
            specialty: row.specialty_name,
            specialty_group: row.specialty_group,
            address: {
                street: row.provider_first_line_business_practice_location_address,
                street2: row.provider_second_line_business_practice_location_address,
                city: row.provider_business_practice_location_address_city_name,
                state: row.provider_business_practice_location_address_state_name,
                zip: row.provider_business_practice_location_address_postal_code,
                phone: row.provider_business_practice_location_address_telephone_number
            },
            drug: {
                brand_name: row.brand_name,
                generic_name: row.generic_name,
                drug_class: row.drug_class,
                therapeutic_class: row.therapeutic_class,
                drug_family: row.drug_family,
                controlled_substance: !!row.controlled_substance,
                controlled_schedule: row.controlled_schedule,
                route_of_administration: row.route_of_administration
            },
            total_claims: row.total_claim_count,
            distance_miles: Math.round(row.distance_miles * 10) / 10
        }))
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
