export default function ColdStartLoading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Card skeleton */}
        <div className="animate-pulse bg-gray-100 rounded-xl shadow-md min-h-64 w-full mb-4" />
        {/* Rating buttons skeleton */}
        <div className="flex justify-center gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-md h-10 w-20" />
          ))}
        </div>
      </div>
    </main>
  )
}
