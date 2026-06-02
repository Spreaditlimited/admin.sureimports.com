import LoginForm from './components/LoginForm';

const Login = () => {
  const siteKey = process.env.GOOGLE_CAPTCHA_SITE_KEY || '';
  return <LoginForm siteKey={siteKey} />;
};

export default Login;
