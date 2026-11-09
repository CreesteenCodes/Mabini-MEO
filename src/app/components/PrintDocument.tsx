import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface PrintSection {
  title: string;
  fields: Array<{
    label: string;
    value: string | number | undefined | null;
    width?: 'full' | 'half' | 'third' | 'quarter';
  }>;
}

interface PrintDocumentProps {
  title: string;
  referenceId?: string;
  sections: PrintSection[];
  attachment?: {
    name: string;
    type: string;
    dataUrl: string;
  };
  onComplete: () => void;
}

export function PrintDocument({ title, referenceId, sections, attachment, onComplete }: PrintDocumentProps) {
  const onCompleteRef = useRef(onComplete);
  const printStartedRef = useRef(false);
  const printFinishedRef = useRef(false);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Office of the Municipal Engineer · Bayan ng Mabini';
    let timer: number | undefined;
    let isDisposed = false;
    const printWhenReady = async () => {
      await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('.print-document img'))
        .filter((image) => !image.complete)
        .map((image) => new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        })));
      if (isDisposed || printStartedRef.current) return;
      printStartedRef.current = true;
      timer = window.setTimeout(() => window.print(), 50);
    };
    void printWhenReady();
    const handleAfterPrint = () => {
      if (!printStartedRef.current || printFinishedRef.current) return;
      printFinishedRef.current = true;
      document.title = previousTitle;
      onCompleteRef.current();
    };
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      isDisposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.title = previousTitle;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <article className="print-document" aria-hidden="true">
      <header className="print-official-header">
        <div className="print-official-copy">
          <div>Republic of the Philippines</div>
          <div className="print-municipality">Province of Batangas</div>
          <div className="print-municipality">Municipality of Mabini</div>
          <div className="print-header-spacer" />
          <div className="print-office">Office of the Municipal Engineer</div>
        </div>
      </header>
      <div className="print-document-title">{title}</div>
      {referenceId && <div className="print-reference">Reference No.: {referenceId}</div>}
      {sections.map((section) => (
        <section key={section.title} className="print-section">
          <h2>{section.title}</h2>
          <div className="print-fields-grid">
            {section.fields.map((field) => (
              <div key={field.label} className={`print-field print-field-${field.width || 'full'}`}>
                <div className="print-field-label">{field.label}</div>
                <div className="print-field-value">
                  {field.value === undefined || field.value === null || field.value === '' ? 'N/A' : field.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {attachment?.type.startsWith('image/') && (
        <section className="print-attachment">
          <img src={attachment.dataUrl} alt="" className="print-attachment-image" />
        </section>
      )}
    </article>,
    document.body,
  );
}
