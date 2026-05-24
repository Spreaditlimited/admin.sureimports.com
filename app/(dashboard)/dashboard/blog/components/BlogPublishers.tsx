'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  RefreshCw,
  Users,
  FileText,
  X,
  ArrowLeft,
  Upload,
  Mail,
  Globe,
  User,
  Briefcase,
} from 'lucide-react';

interface BlogPublisher {
  id: number;
  pidPublisher: string;
  publisherName: string;
  publisherSlug: string | null;
  publisherEmail: string | null;
  publisherBio: string | null;
  publisherRole: string | null;
  publisherImage: string | null;
  publisherSocialX: string | null;
  publisherSocialLinkedin: string | null;
  publisherSocialFacebook: string | null;
  publisherSocialInstagram: string | null;
  publisherWebsite: string | null;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  _count: {
    blogs: number;
  };
}

interface PublisherFormData {
  publisherName: string;
  publisherEmail: string;
  publisherBio: string;
  publisherRole: string;
  publisherSocialX: string;
  publisherSocialLinkedin: string;
  publisherSocialFacebook: string;
  publisherSocialInstagram: string;
  publisherWebsite: string;
}

const initialFormData: PublisherFormData = {
  publisherName: '',
  publisherEmail: '',
  publisherBio: '',
  publisherRole: '',
  publisherSocialX: '',
  publisherSocialLinkedin: '',
  publisherSocialFacebook: '',
  publisherSocialInstagram: '',
  publisherWebsite: '',
};

const BlogPublishers = () => {
  const [publishers, setPublishers] = useState<BlogPublisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<BlogPublisher | null>(null);
  const [formData, setFormData] = useState<PublisherFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPublishers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crud/blog-publisher/fetch');
      const data = await res.json();

      if (data.successx) {
        setPublishers(data.data);
      } else {
        toast.error('Failed to fetch publishers');
      }
    } catch (error) {
      console.error('Error fetching publishers:', error);
      toast.error('An error occurred while fetching publishers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublishers();
  }, [fetchPublishers]);

  const filteredPublishers = publishers.filter((pub) =>
    pub.publisherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pub.publisherEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pub.publisherRole?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getImageUrl = (imageName: string | null) => {
    if (!imageName) return null;
    if (imageName.startsWith('http://') || imageName.startsWith('https://')) {
      return imageName;
    }
    return `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${imageName}`;
  };

  const openCreateModal = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditingPublisher(null);
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (publisher: BlogPublisher) => {
    setFormData({
      publisherName: publisher.publisherName,
      publisherEmail: publisher.publisherEmail || '',
      publisherBio: publisher.publisherBio || '',
      publisherRole: publisher.publisherRole || '',
      publisherSocialX: publisher.publisherSocialX || '',
      publisherSocialLinkedin: publisher.publisherSocialLinkedin || '',
      publisherSocialFacebook: publisher.publisherSocialFacebook || '',
      publisherSocialInstagram: publisher.publisherSocialInstagram || '',
      publisherWebsite: publisher.publisherWebsite || '',
    });
    setIsEditing(true);
    setEditingPublisher(publisher);
    setImageFile(null);
    setImagePreview(publisher.publisherImage ? getImageUrl(publisher.publisherImage) : null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditingPublisher(null);
    setFormData(initialFormData);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.publisherName.trim()) {
      toast.error('Publisher name is required');
      return;
    }

    setSubmitting(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('publisherName', formData.publisherName);
      formDataObj.append('publisherEmail', formData.publisherEmail);
      formDataObj.append('publisherBio', formData.publisherBio);
      formDataObj.append('publisherRole', formData.publisherRole);
      formDataObj.append('publisherSocialX', formData.publisherSocialX);
      formDataObj.append('publisherSocialLinkedin', formData.publisherSocialLinkedin);
      formDataObj.append('publisherSocialFacebook', formData.publisherSocialFacebook);
      formDataObj.append('publisherSocialInstagram', formData.publisherSocialInstagram);
      formDataObj.append('publisherWebsite', formData.publisherWebsite);

      if (imageFile) {
        formDataObj.append('image', imageFile);
      }

      if (isEditing && editingPublisher) {
        formDataObj.append('pidPublisher', editingPublisher.pidPublisher);
      }

      const url = isEditing
        ? '/api/crud/blog-publisher/update'
        : '/api/crud/blog-publisher/create';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: formDataObj,
      });

      const data = await res.json();

      if (data.successx) {
        toast.success(data.responsex.message);
        closeModal();
        fetchPublishers();
      } else {
        toast.error(data.responsex?.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error submitting publisher:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pidPublisher: string) => {
    try {
      const res = await fetch(
        `/api/crud/blog-publisher/delete?pidPublisher=${pidPublisher}`,
        { method: 'DELETE' }
      );
      const data = await res.json();

      if (data.successx) {
        toast.success(data.responsex.message);
        setDeleteConfirm(null);
        fetchPublishers();
      } else {
        toast.error(data.responsex?.message || 'Failed to delete publisher');
      }
    } catch (error) {
      console.error('Error deleting publisher:', error);
      toast.error('An error occurred');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/blog/view"
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              Blog Publishers
            </h1>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400 ml-12">
            Manage authors and content creators for your blog
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPublishers}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>New Publisher</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Publishers
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {publishers.length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Posts
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {publishers.reduce((acc, pub) => acc + pub._count.blogs, 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Active Publishers
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                {publishers.filter((p) => p.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <User className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search publishers by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Publishers Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Loading publishers...
              </p>
            </div>
          </div>
        ) : filteredPublishers.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No publishers found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchTerm
                  ? 'Try a different search term'
                  : 'Get started by adding your first publisher'}
              </p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add First Publisher
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPublishers.map((publisher) => (
                <div
                  key={publisher.pidPublisher}
                  className="group bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                        {getImageUrl(publisher.publisherImage) ? (
                          <img
                            src={getImageUrl(publisher.publisherImage)!}
                            alt={publisher.publisherName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-7 h-7 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                          {publisher.publisherName}
                        </h3>
                        {publisher.publisherRole && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" />
                            {publisher.publisherRole}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(publisher)}
                        className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(publisher.pidPublisher)}
                        className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bio */}
                  {publisher.publisherBio && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {publisher.publisherBio}
                    </p>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    {publisher.publisherEmail && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{publisher.publisherEmail}</span>
                      </p>
                    )}
                    {publisher.publisherWebsite && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span className="truncate">{publisher.publisherWebsite}</span>
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {publisher._count.blogs} post{publisher._count.blogs !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(publisher.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isEditing ? 'Edit Publisher' : 'Add New Publisher'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Profile Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Profile Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {imagePreview ? 'Change Image' : 'Upload Image'}
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Max 5MB. JPG, PNG, or WebP.
                    </p>
                  </div>
                </div>
              </div>

              {/* Publisher Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.publisherName}
                  onChange={(e) =>
                    setFormData({ ...formData, publisherName: e.target.value })
                  }
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>

              {/* Email & Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.publisherEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, publisherEmail: e.target.value })
                    }
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={formData.publisherRole}
                    onChange={(e) =>
                      setFormData({ ...formData, publisherRole: e.target.value })
                    }
                    placeholder="e.g., Content Lead"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.publisherBio}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      publisherBio: e.target.value,
                    })
                  }
                  placeholder="Brief biography of the publisher..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.publisherWebsite}
                  onChange={(e) =>
                    setFormData({ ...formData, publisherWebsite: e.target.value })
                  }
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>

              {/* Social Media Links */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Social Media Links
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      X (Twitter)
                    </label>
                    <input
                      type="url"
                      value={formData.publisherSocialX}
                      onChange={(e) =>
                        setFormData({ ...formData, publisherSocialX: e.target.value })
                      }
                      placeholder="https://x.com/username"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={formData.publisherSocialLinkedin}
                      onChange={(e) =>
                        setFormData({ ...formData, publisherSocialLinkedin: e.target.value })
                      }
                      placeholder="https://linkedin.com/in/username"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Facebook
                    </label>
                    <input
                      type="url"
                      value={formData.publisherSocialFacebook}
                      onChange={(e) =>
                        setFormData({ ...formData, publisherSocialFacebook: e.target.value })
                      }
                      placeholder="https://facebook.com/username"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={formData.publisherSocialInstagram}
                      onChange={(e) =>
                        setFormData({ ...formData, publisherSocialInstagram: e.target.value })
                      }
                      placeholder="https://instagram.com/username"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-xl transition-colors"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {isEditing ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : isEditing ? (
                    'Update Publisher'
                  ) : (
                    'Create Publisher'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                Delete Publisher?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                This action cannot be undone. Publishers with blog posts cannot
                be deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPublishers;
