import { useTrashStore } from '../store/trashStore';
import { GLYPHS } from '../theme/glyphs';
import PixelIcon from '../components/PixelIcon';

/** The Trash is always empty. Clicking the can just makes it jiggle, here and in the dock. */
export default function Trash() {
  const shakeToken = useTrashStore((state) => state.shakeToken);
  const shake = useTrashStore((state) => state.shake);

  return (
    <div className="cx-trash cx-ui">
      <button type="button" className="cx-trash__can" aria-label="Empty Trash" onClick={shake}>
        <span key={shakeToken} className="cx-trash__icon" data-shaking={shakeToken > 0 ? 'true' : 'false'}>
          <PixelIcon glyph={GLYPHS.trash} size={64} />
        </span>
      </button>
      <div className="cx-trash__text">The Trash is empty.</div>
    </div>
  );
}
