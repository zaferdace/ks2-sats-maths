import { useLayoutEffect, useRef } from 'react';
import { readingText } from '../english/bank';
import { RichText } from './RichText';

const GENRE: Record<string, string> = { fiction: 'Story', 'non-fiction': 'Non-fiction', poetry: 'Poem' };

/** A subheading in a leaflet or report: short, with no closing punctuation. */
const isHeading = (p: string) => p.length < 60 && !/[.!?:"”’']$/.test(p.trim());

interface Props {
  textId: string;
  /** 1-based paragraph the current question points to: highlighted and scrolled into view. */
  paragraph?: number;
  className?: string;
}

/** A reading text with numbered paragraphs (or stanzas). */
export function Passage({ textId, paragraph, className }: Props) {
  const text = readingText(textId);
  const panel = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const box = panel.current;
    if (!box || !paragraph) return;
    const el = box.querySelector<HTMLElement>(`[data-paragraph="${paragraph}"]`);
    // Scroll the panel only, never the page.
    if (el && box.scrollHeight > box.clientHeight) box.scrollTo({ top: Math.max(el.offsetTop - box.offsetTop - 12, 0) });
  }, [paragraph, textId]);

  if (!text) return <aside className={`passage ${className ?? ''}`}>This text is missing.</aside>;
  const poem = text.genre === 'poetry';
  return (
    <aside ref={panel} className={`passage ${poem ? 'poem' : ''} ${className ?? ''}`} aria-label={`Text: ${text.title}`}>
      <div className="passage-genre">{GENRE[text.genre]}</div>
      <h2 className="passage-title">{text.title}</h2>
      {text.paragraphs.map((p, i) => (
        <div
          key={i}
          data-paragraph={i + 1}
          className={`passage-para ${paragraph === i + 1 ? 'current' : ''} ${!poem && isHeading(p) ? 'heading' : ''}`}
        >
          <span className="para-num" aria-label={`${poem ? 'Verse' : 'Paragraph'} ${i + 1}`}>
            {i + 1}
          </span>
          <RichText text={p} />
        </div>
      ))}
    </aside>
  );
}
