import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browser Not Supported - Kabisa',
  description: 'Your browser is not supported. Please update to continue.',
  robots: 'noindex, nofollow',
}

const browsers = [
  {
    name: 'Google Chrome',
    minVersion: '88',
    url: 'https://www.google.com/chrome/',
    icon: '🌐'
  },
  {
    name: 'Mozilla Firefox', 
    minVersion: '72',
    url: 'https://www.mozilla.org/firefox/',
    icon: '🦊'
  },
  {
    name: 'Microsoft Edge',
    minVersion: '88', 
    url: 'https://www.microsoft.com/edge/',
    icon: '🔷'
  },
  {
    name: 'Safari',
    minVersion: '14',
    url: 'https://www.apple.com/safari/',
    icon: '🧭'
  }
]

export default function UnsupportedBrowserPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Browser Update Required
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Your current browser doesn't support the modern web technologies required for Kabisa. 
              Please update to one of the supported browsers below to continue.
            </p>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 text-center">
            Supported Browsers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {browsers.map((browser) => (
              <a
                key={browser.name}
                href={browser.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
              >
                <span className="text-2xl mr-4">{browser.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 group-hover:text-blue-700">
                    {browser.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Version {browser.minVersion}+
                  </p>
                </div>
                <span className="text-gray-400 group-hover:text-blue-500">→</span>
              </a>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="text-center">
            <h3 className="font-semibold text-gray-800 mb-3">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              If you're having trouble updating your browser, our support team is here to help.
            </p>
            <a
              href="mailto:support@gokabisa.com"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              📧 Contact Support
            </a>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Minimum supported versions: Chrome/Edge 88+, Firefox 72+, Safari/iOS 14+
          </p>
        </div>
      </div>
    </div>
  )
}