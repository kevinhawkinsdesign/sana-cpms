import AuthCatchAllClient from './AuthCatchAllClient';

// Static export needs every dynamic path known at build time — this app has
// no server to render one on demand. IDs come straight from the same seed
// data the mock backend serves, so this stays in sync automatically.
export function generateStaticParams() {
  return [{ auth: ['login'] }, { auth: ['signup'] }];
}

export default function Page() {
  return <AuthCatchAllClient />;
}
