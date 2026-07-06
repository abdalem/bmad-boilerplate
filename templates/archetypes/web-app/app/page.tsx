export default function Page() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 720,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '28px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 34 }}>__PROJECT_NAME__</h1>
        <p style={{ marginTop: 12, color: '#475569', lineHeight: 1.6 }}>
          Generic web starter powered by Next.js. Replace this page with your first product flow.
        </p>
      </section>
    </main>
  );
}
