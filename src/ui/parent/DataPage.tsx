import { parentStrings } from '../strings';

export function DataPage(props: { onChanged: () => void }) {
  void props;
  return (
    <h1 className="title" tabIndex={-1}>
      {parentStrings.data.title}
    </h1>
  );
}
