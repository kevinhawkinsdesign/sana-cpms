// Kabisa Console — Organization signup & onboarding flow (full-screen, outside shell)
const { useState: useStateOb } = React;

const OB_STEPS = ['Account', 'Company', 'First station', 'Go live'];

function ObField({ label, placeholder, defaultValue, type = 'text', half }) {
  return (
    <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, display: 'block', gridColumn: half ? 'span 1' : 'span 2' }}>
      {label}
      <input type={type} placeholder={placeholder} defaultValue={defaultValue} style={{
        width: '100%', marginTop: 5, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 7,
        background: 'var(--surface)', color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit',
      }} />
    </label>
  );
}

function OnboardingScreen({ navigate }) {
  const [step, setStep] = useStateOb(0);
  const next = () => step < 3 ? setStep(step + 1) : navigate('overview');
  return (
    <div style={{ minHeight: '100vh', background: 'var(--page)', display: 'flex', flexDirection: 'column' }}>
      {/* slim header */}
      <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 12, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <img src={(window.__resources && window.__resources.kabisaSymbol) || "assets/kabisa-symbol.png"} alt="Kabisa" style={{ height: 24 }} />
        <span style={{ fontWeight: 650, fontSize: 14, letterSpacing: '-0.01em' }}>Kabisa Charge</span>
        <span style={{ fontSize: 12, color: 'var(--text3)', borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>Create your organization</span>
        <button onClick={() => navigate('overview')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>Skip — back to console</button>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 20px' }}>
        <div style={{ width: 520 }}>
          {/* stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
            {OB_STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: i < step ? 'var(--ok)' : i === step ? 'var(--accent)' : 'var(--sunken)',
                    color: i < step ? '#fff' : i === step ? 'var(--accent-ink)' : 'var(--text3)',
                    border: i > step ? '1px solid var(--border)' : 'none',
                  }}>{i < step ? <Icon name="check" size={11} stroke={3} /> : i + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: i === step ? 600 : 450, color: i === step ? 'var(--text)' : 'var(--text3)', whiteSpace: 'nowrap' }}>{s}</span>
                </div>
                {i < 3 && <div style={{ flex: 1, height: 1.5, background: i < step ? 'var(--ok)' : 'var(--border)', margin: '0 10px' }}></div>}
              </React.Fragment>
            ))}
          </div>

          <div className="kc-card kc-fadeup" key={step} style={{ padding: 28 }}>
            {step === 0 && <>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 650, letterSpacing: '-0.02em' }}>Create your account</h2>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text3)' }}>You'll be the owner of your organization. You can invite your team later.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ObField label="First name" placeholder="Aline" half />
                <ObField label="Last name" placeholder="Uwase" half />
                <ObField label="Work email" placeholder="you@company.rw" type="email" />
                <ObField label="Password" placeholder="12+ characters" type="password" />
              </div>
            </>}
            {step === 1 && <>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 650, letterSpacing: '-0.02em' }}>About your company</h2>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text3)' }}>Used for billing, payouts, and RRA fiscal receipts (EBM).</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ObField label="Company name" placeholder="Volcanoes Mobility Ltd" />
                <ObField label="TIN (tax ID)" placeholder="112 233 445" half />
                <ObField label="Country" defaultValue="Rwanda" half />
                <ObField label="Payout bank account" placeholder="Bank of Kigali · RWF" />
              </div>
            </>}
            {step === 2 && <>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 650, letterSpacing: '-0.02em' }}>Add your first station</h2>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text3)' }}>Point your charger's OCPP endpoint at Kabisa and it appears here automatically.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <ObField label="Station name" placeholder="Kigali Heights" half />
                <ObField label="Area" placeholder="Kacyiru, Kigali" half />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, marginBottom: 5 }}>Your OCPP connection URL</div>
              <div className="mono" style={{ fontSize: 12, background: 'var(--sunken)', border: '1px solid var(--border)', borderRadius: 7, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                wss://ocpp.gokabisa.com/2.0.1/<b>your-org</b>
                <Btn size="xs" style={{ marginLeft: 'auto' }}>Copy</Btn>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, padding: '10px 12px', borderRadius: 7, background: 'var(--ok-soft)', border: '1px solid var(--ok-border)', fontSize: 12.5, color: 'var(--ok)' }}>
                <span className="kc-pulse" style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--ok)' }}></span>
                Listening for your charger… works with any OCPP 1.6J / 2.0.1 device
              </div>
            </>}
            {step === 3 && <>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-ink)', marginBottom: 14 }}>
                <Icon name="bolt" size={24} stroke={2} />
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 650, letterSpacing: '-0.02em' }}>You're ready to go live</h2>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                Your organization is set up. Next, from your console you can:
              </p>
              {[['tariff', 'Set your rates', 'Per-kWh pricing with time-of-use bands'], ['people', 'Invite your team', 'Owners, finance, and station operators'], ['money', 'Watch revenue land', 'Weekly payouts, EBM handled automatically']].map(([ic, t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 11, padding: '9px 0', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text2)' }}><Icon name={ic} size={17} /></span>
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>{d}</div></div>
                </div>
              ))}
            </>}

            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              {step > 0 && step < 3 && <Btn onClick={() => setStep(step - 1)} icon="arrowL">Back</Btn>}
              <Btn variant="primary" size="md" style={{ marginLeft: 'auto' }} onClick={next}>
                {step === 3 ? 'Open my console' : 'Continue'} {step < 3 && <Icon name="chevR" size={13} />}
              </Btn>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text3)', marginTop: 16 }}>
            Free while you onboard · pay 2% of charge revenue once live · cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}

window.OnboardingScreen = OnboardingScreen;
