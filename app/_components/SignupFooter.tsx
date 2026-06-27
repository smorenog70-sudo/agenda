export default function SignupFooter({ url }: { url: string }) {
  if (!url) return null;
  return (
    <footer className="px-5 py-6 text-center">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-slate-400 transition hover:text-slate-600"
      >
        ¿Quieres tu propia agenda?{" "}
        <span className="font-medium underline">Crea tu cuenta con SMG-Calendar</span>
      </a>
    </footer>
  );
}
