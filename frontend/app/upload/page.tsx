'use client';

import SyllabusUpload from '@/components/SyllabusUpload';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UploadPage() {
  const router = useRouter();

  const handleUploadSuccess = () => {
    // Redirect to dashboard after successful upload
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Upload Syllabus
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Upload a PDF syllabus and our AI will automatically extract all assignments and deadlines.
          </p>

          <SyllabusUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>
    </div>
  );
}

