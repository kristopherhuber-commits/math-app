import { parentStrings } from '../strings';

export function SettingsPage(props: { onChanged: () => void }) {
  void props;
  return (
    <h1 className="title" tabIndex={-1}>
      {parentStrings.settings.title}
    </h1>
  );
}
