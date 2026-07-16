// Kabisa Console — root app: hash router, shell composition, tweaks
const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "Light",
  "density": "compact",
  "sidebarLabels": true
}/*EDITMODE-END*/;

function useHashRoute() {
  const get = () => (window.location.hash || '#/overview').replace(/^#\//, '');
  const [route, setRoute] = useStateA(get);
  useEffectA(() => {
    const h = () => setRoute(get());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const navigate = r => { window.location.hash = '#/' + r; window.scrollTo(0, 0); };
  return [route, navigate];
}

function Screen({ route, navigate }) {
  const [root, param] = [route.split('/')[0], route.split('/').slice(1).join('/')];
  switch (root) {
    case 'overview': return <OverviewScreen navigate={navigate} />;
    case 'stations': return param ? <StationDetailScreen id={param} navigate={navigate} /> : <StationsScreen navigate={navigate} />;
    case 'chargers': return <ChargerDetailScreen id={param} navigate={navigate} />;
    case 'sessions': return param ? <SessionDetailScreen id={param} navigate={navigate} /> : <SessionsScreen navigate={navigate} />;
    case 'tariffs': return <TariffsScreen />;
    case 'revenue': return <RevenueScreen navigate={navigate} />;
    case 'compliance': return <ComplianceScreen navigate={navigate} />;
    case 'people': return <PeopleScreen />;
    case 'team': return <TeamScreen />;
    case 'settings': return <SettingsScreen />;
    default: return <OverviewScreen navigate={navigate} />;
  }
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, navigate] = useHashRoute();
  const [org, setOrg] = useStateA(KC_DATA.ORGS[1]);
  const mode = t.theme === 'Dark' ? 'dark' : 'light';
  const isOnboarding = route.split('/')[0] === 'onboarding';

  return (
    <>
      <ThemeStyle mode={mode} density={t.density} />
      {isOnboarding ? (
        <OnboardingScreen navigate={navigate} />
      ) : (
        <div data-screen-label={route.split('/')[0]}>
          <TopBar org={org} setOrg={setOrg} navigate={navigate} route={route} />
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <Sidebar route={route} navigate={navigate} org={org} />
            <main style={{ flex: 1, minWidth: 0, padding: '20px 24px 48px', maxWidth: 1480, margin: '0 auto' }}>
              <Screen route={route} navigate={navigate} />
            </main>
          </div>
        </div>
      )}
      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakRadio label="Theme" value={t.theme} options={['Light', 'Dark']} onChange={v => setTweak('theme', v)} />
        <TweakRadio label="Density" value={t.density} options={['compact', 'comfortable']} onChange={v => setTweak('density', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
