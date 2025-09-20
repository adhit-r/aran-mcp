export default function TestPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Aran Design System Test
      </h1>
      <div className="bg-blue-500 text-white p-4 rounded-lg mb-4">
        <p>This is a blue box with white text</p>
      </div>
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <p className="text-gray-800">This is a gray box with dark text</p>
      </div>
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Test Button
      </button>
    </div>
  );
}
