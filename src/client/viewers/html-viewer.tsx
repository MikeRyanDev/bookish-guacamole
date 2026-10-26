import filesStyles from "../styles/files.module.css";
/** Runs the original HTML in an opaque-origin sandbox, without access to the parent app. */
export default function HtmlViewer({ content }: { content: string }) {
  return (
    <iframe
      className={filesStyles.htmlPreview}
      title="HTML preview"
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      allow="camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'"
      srcDoc={content}
    />
  );
}
