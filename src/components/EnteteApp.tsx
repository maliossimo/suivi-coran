export function EnteteApp({ sousTitre }: { sousTitre?: string }) {
  return (
    <div className="entete-app">
      <div className="logo" aria-hidden="true">
        ق
      </div>
      <h1>Suivi cours Coran</h1>
      {sousTitre ? <p>{sousTitre}</p> : null}
    </div>
  );
}
