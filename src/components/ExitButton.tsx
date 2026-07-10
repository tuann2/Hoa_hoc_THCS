import { useNavigate } from 'react-router-dom';

interface ExitButtonProps {
  confirmMessage: string;
}

export function ExitButton({ confirmMessage }: ExitButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          navigate('/');
        }
      }}
      type="button"
    >
      ✕ Thoát
    </button>
  );
}
