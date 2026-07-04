import { Fragment, type ReactNode } from 'react';

interface ChemProps {
  text: string;
  className?: string;
}

function shouldSubscript(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z)\]]/.test(char);
}

function renderTokens(text: string) {
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < text.length) {
    const arrow = text.slice(index, index + 3);

    if (arrow === '<->') {
      nodes.push(
        <Fragment key={`arrow-${index}`}>
          {' '}
          <span aria-label="mũi tên hai chiều">⇌</span>{' '}
        </Fragment>
      );
      index += 3;
      continue;
    }

    if (text.slice(index, index + 2) === '->') {
      nodes.push(
        <Fragment key={`arrow-${index}`}>
          {' '}
          <span aria-label="mũi tên phản ứng">→</span>{' '}
        </Fragment>
      );
      index += 2;
      continue;
    }

    if (text[index] === '^') {
      let superscript = '';
      index += 1;

      while (index < text.length && /[0-9+-]/.test(text[index])) {
        superscript += text[index];
        index += 1;
      }

      nodes.push(<sup key={`sup-${index}`}>{superscript}</sup>);
      continue;
    }

    if (/\d/.test(text[index]) && shouldSubscript(text[index - 1])) {
      let digits = '';

      while (index < text.length && /\d/.test(text[index])) {
        digits += text[index];
        index += 1;
      }

      nodes.push(<sub key={`sub-${index}`}>{digits}</sub>);
      continue;
    }

    nodes.push(text[index]);
    index += 1;
  }

  return nodes;
}

export function Chem({ text, className }: ChemProps) {
  return <span className={className}>{renderTokens(text)}</span>;
}

export function ChemParagraph({ text, className }: ChemProps) {
  return (
    <div className={className}>
      {text.split('\n').map((line, index) => (
        <p key={`${line}-${index}`} className={index > 0 ? 'mt-2' : ''}>
          <Chem text={line} />
        </p>
      ))}
    </div>
  );
}
