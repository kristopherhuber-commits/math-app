// TopBar (design.md §5): ‹ Home, the topic, and the question number. Stars, shells and the
// assignment progress bar arrive with M4.
import { strings } from '../strings';

export function TopBar({
  title,
  questionNumber,
  onHome,
}: {
  title: string;
  questionNumber: number;
  onHome: () => void;
}) {
  return (
    <header className="topbar">
      <button type="button" className="btn btn-outline btn-small" onClick={onHome}>
        {strings.topBar.home}
      </button>
      <span className="topbar-title">{title}</span>
      <span className="topbar-progress label">{strings.topBar.question(questionNumber)}</span>
    </header>
  );
}
