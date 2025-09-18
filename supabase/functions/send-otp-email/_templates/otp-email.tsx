import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface OtpEmailProps {
  token: string;
  userName: string;
  actionText: string;
  appName: string;
}

export const OtpEmail = ({
  token,
  userName,
  actionText,
  appName
}: OtpEmailProps) => (
  <Html>
    <Head />
    <Preview>Your verification code: {token}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Text style={logo}>
            <span style={logoBrand}>RX</span>
            Prescribers
          </Text>
        </Section>
        
        <Heading style={h1}>Your verification code</Heading>
        
        <Text style={text}>
          Hi {userName},
        </Text>
        
        <Text style={text}>
          Use this code to {actionText}:
        </Text>
        
        <Section style={codeContainer}>
          <Text style={code}>{token}</Text>
        </Section>
        
        <Text style={text}>
          This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.
        </Text>
        
        <Text style={footer}>
          <Link
            href="https://rxprescribers.com"
            target="_blank"
            style={link}
          >
            {appName}
          </Link>
          {' • '}
          <Link
            href="https://rxprescribers.com/support"
            target="_blank"
            style={link}
          >
            Support
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#f6f9fc',
  padding: '10px 0',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: '8px',
  padding: '45px',
  margin: '40px auto',
  maxWidth: '500px',
};

const logoContainer = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logo = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const logoBrand = {
  background: 'linear-gradient(to right, #06b6d4, #8b5cf6)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const h1 = {
  color: '#1a1a1a',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  fontSize: '24px',
  fontWeight: 'normal',
  margin: '30px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#6a737d',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const codeContainer = {
  background: '#f8fafc',
  borderRadius: '8px',
  margin: '32px 0',
  padding: '24px',
  textAlign: 'center' as const,
  border: '1px solid #e1e8ed',
};

const code = {
  color: '#1a1a1a',
  fontFamily: 'Consolas,Monaco,"Courier New",monospace',
  fontSize: '32px',
  fontWeight: 'bold',
  letterSpacing: '8px',
  lineHeight: '40px',
  margin: '0',
};

const footer = {
  color: '#8898aa',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '32px 0 0',
  textAlign: 'center' as const,
};

const link = {
  color: '#067df7',
  textDecoration: 'none',
};

export default OtpEmail;
