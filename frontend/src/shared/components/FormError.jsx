export default function FormError({ message }) {
  return (
    <div role="alert">
      {message && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {message}
        </p>
      )}
    </div>
  );
}
