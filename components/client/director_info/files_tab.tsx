'use client'

import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  Eye, 
  Loader2, 
  CheckCircle2, 
  X,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { 
  uploadFilesToServer, 
  getUploadedFiles, 
  deleteUploadedFile,
  getFileDownloadUrl,
  downloadFile,
  getFilePreviewBlobUrl,
  type UploadResponse,
  getUserData
} from '@/lib/api/index'
import { UserRole } from '@/lib/api/types'

interface FilesTabProps {
  clientId: string | number
  clientName?: string
}

type UploadItem = {
  id: string
  file?: File
  serverFile?: UploadResponse
  filename: string
  fileType?: string
  fileSize: number
  uploadedAt: number | string
  status?: 'pending' | 'uploading' | 'success' | 'error'
  progress?: number
  error?: string
  isServerFile?: boolean
}

export function FilesTab({ 
  clientId,
  clientName = ''
}: FilesTabProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<UploadItem[]>([])
  const [serverFiles, setServerFiles] = useState<UploadResponse[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [previewFile, setPreviewFile] = useState<UploadResponse | null>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const user = getUserData()
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.MASTER_ADMIN || user?.role === UserRole.EMPLOYEE

  // Fetch files from server
  const fetchServerFiles = async () => {
    setIsLoadingFiles(true)
    try {
      const files = await getUploadedFiles()
      // Filter files to only show files for this specific client
      const clientIdNum = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId
      const filteredFiles = files.filter(file => file.client_id === clientIdNum)
      setServerFiles(filteredFiles)
    } catch (error: any) {
      console.error('Failed to fetch uploaded files:', error)
      toast({
        title: 'Error',
        description: error?.detail || error?.message || 'Failed to fetch files',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingFiles(false)
    }
  }

  useEffect(() => {
    fetchServerFiles()
  }, [clientId])

  // Convert server files to UploadItem format
  useEffect(() => {
    const serverItems: UploadItem[] = serverFiles.map((file) => ({
      id: `server-${file.id}`,
      filename: file.filename,
      fileSize: file.file_size,
      uploadedAt: file.uploaded_at,
      fileType: file.file_type,
      serverFile: file,
      status: 'success' as const,
      isServerFile: true,
    }))
    
    setItems(prev => {
      const localItems = prev.filter(item => !item.isServerFile)
      const existingServerIds = new Set(prev.filter(item => item.isServerFile).map(item => item.id))
      const newServerItems = serverItems.filter(item => !existingServerIds.has(item.id))
      return [...localItems, ...serverItems]
    })
  }, [serverFiles])

  // Helper functions
  const getFileFormat = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN'
    return extension
  }

  const getFileType = (item: UploadItem): string => {
    if (item.isServerFile && item.serverFile?.file_type) {
      const typeParts = item.serverFile.file_type.split('/')
      return typeParts[0].charAt(0).toUpperCase() + typeParts[0].slice(1) || 'Unknown'
    }
    if (item.file?.type) {
      const typeParts = item.file.type.split('/')
      return typeParts[0].charAt(0).toUpperCase() + typeParts[0].slice(1) || 'Unknown'
    }
    const extension = item.filename.split('.').pop()?.toLowerCase() || ''
    const typeMap: Record<string, string> = {
      'pdf': 'Document',
      'doc': 'Document',
      'docx': 'Document',
      'xls': 'Spreadsheet',
      'xlsx': 'Spreadsheet',
      'ppt': 'Presentation',
      'pptx': 'Presentation',
      'jpg': 'Image',
      'jpeg': 'Image',
      'png': 'Image',
      'gif': 'Image',
      'svg': 'Image',
      'txt': 'Text',
      'csv': 'Data',
      'zip': 'Archive',
      'rar': 'Archive',
    }
    return typeMap[extension] || 'File'
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (timestamp: number | string): string => {
    const date = new Date(timestamp)
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }
    return date.toLocaleDateString('en-US', options)
  }

  const formatTime = (timestamp: number | string): string => {
    const date = new Date(timestamp)
    const options: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    }
    return date.toLocaleTimeString('en-US', options)
  }

  // File selection handler
  const onPickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const acceptedFiles: File[] = []
    const rejectedFiles: string[] = []
    const maxSize = 50 * 1024 * 1024 // 50MB
    
    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        rejectedFiles.push(`${file.name} (file too large, max 50MB)`)
        return
      }
      if (file.size === 0) {
        rejectedFiles.push(`${file.name} (empty file)`)
        return
      }
      acceptedFiles.push(file)
    })
    
    if (rejectedFiles.length > 0) {
      toast({
        title: 'Some Files Rejected',
        description: rejectedFiles.join(', '),
        variant: 'destructive',
      })
    }
    
    if (acceptedFiles.length > 0) {
      const next: UploadItem[] = acceptedFiles.map((file) => ({
        id: `local-${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
        file,
        filename: file.name,
        fileSize: file.size,
        uploadedAt: file.lastModified,
        status: 'pending',
        progress: 0,
        isServerFile: false,
      }))
      setItems((prev) => [...prev, ...next])
      
      toast({
        title: 'Files Added',
        description: `Added ${acceptedFiles.length} file(s) to upload queue.`,
        variant: 'default',
      })
    }
  }

  // Upload handler
  const handleUpload = async () => {
    const pendingItems = items.filter(item => !item.isServerFile && item.status !== 'success' && item.file)
    if (pendingItems.length === 0) {
      toast({ 
        title: "No Files to Upload", 
        description: "All files have been uploaded or no files selected.",
        variant: 'default',
      })
      return
    }

    const filesToUpload = pendingItems.map(item => item.file!).filter((file): file is File => file !== undefined)
    
    setItems(prev => prev.map(item => 
      pendingItems.some(p => p.id === item.id) 
        ? { ...item, status: 'uploading' as const, progress: 0 }
        : item
    ))

    try {
      await uploadFilesToServer(
        filesToUpload,
        clientId, // Pass client_id to associate files with client
        (progress) => {
          setItems(prev => prev.map(item => 
            item.status === 'uploading' 
              ? { ...item, progress }
              : item
          ))
        }
      )
      
      setItems(prev => prev.filter(item => !pendingItems.some(p => p.id === item.id)))
      await fetchServerFiles()
      
      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${filesToUpload.length} file(s).`,
        variant: 'success',
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      
      setItems(prev => prev.map(item => 
        pendingItems.some(p => p.id === item.id) 
          ? { 
              ...item, 
              status: 'error' as const, 
              error: error?.detail || error?.message || 'Upload failed' 
            }
          : item
      ))
      
      toast({
        title: "Upload Failed",
        description: error?.detail || error?.message || "Failed to upload files. Please try again.",
        variant: 'destructive',
      })
    }
  }

  // Delete handler
  const handleDelete = async (id: string) => {
    const item = items.find((x) => x.id === id)
    
    if (item?.isServerFile && item.serverFile) {
      try {
        await deleteUploadedFile(item.serverFile.id)
        setServerFiles(prev => prev.filter(f => f.id !== item.serverFile!.id))
        setItems(prev => prev.filter((x) => x.id !== id))
        toast({
          title: 'File Deleted',
          description: `${item.filename} has been deleted.`,
          variant: 'default',
        })
      } catch (error: any) {
        console.error('Delete error:', error)
        toast({
          title: 'Delete Failed',
          description: error?.detail || error?.message || 'Failed to delete file.',
          variant: 'destructive',
        })
      }
    } else {
      setItems((prev) => prev.filter((x) => x.id !== id))
      if (item) {
        toast({
          title: 'File Removed',
          description: `${item.filename} has been removed from the queue.`,
          variant: 'default',
        })
      }
    }
  }

  // Preview handler (for admins)
  const handlePreview = async (file: UploadResponse) => {
    setIsLoadingPreview(true)
    setPreviewFile(file)
    try {
      // Fetch file as blob to avoid download trigger
      const blobUrl = await getFilePreviewBlobUrl(file.id)
      setPreviewBlobUrl(blobUrl)
    } catch (error: any) {
      console.error('Preview error:', error)
      toast({
        title: 'Preview Failed',
        description: error?.detail || error?.message || 'Could not load file for preview.',
        variant: 'destructive',
      })
      setPreviewFile(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Clean up blob URL when preview closes
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl)
        setPreviewBlobUrl(null)
      }
    }
  }, [previewBlobUrl])

  // Download handler
  const handleDownload = async (file: UploadResponse) => {
    try {
      await downloadFile(file.id, file.filename)
      toast({
        title: 'Download Started',
        description: `Downloading ${file.filename}...`,
        variant: 'default',
      })
    } catch (error: any) {
      console.error('Download error:', error)
      toast({
        title: 'Download Failed',
        description: error?.detail || error?.message || 'Failed to download file.',
        variant: 'destructive',
      })
    }
  }

  // Get preview URL - use blob URL if available, otherwise fallback to direct URL
  const getPreviewUrl = (file: UploadResponse): string => {
    if (previewBlobUrl && previewFile?.id === file.id) {
      return previewBlobUrl
    }
    // Fallback to direct URL with token (may trigger download, but better than nothing)
    return getFileDownloadUrl(file.id, true)
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg">Files</CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {clientName && `Files for ${clientName}`}
              {!isAdmin && ' - Upload and manage your files'}
              {isAdmin && ' - View, preview, and download client files'}
            </CardDescription>
          </div>
          {!isAdmin && (
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={(e) => {
                  onPickFiles(e.target.files)
                  if (e.target) {
                    e.target.value = ''
                  }
                }}
              />
              <Button 
                type="button" 
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Files
              </Button>
              <Button 
                type="button" 
                size="sm"
                onClick={handleUpload}
                disabled={items.filter(item => !item.isServerFile && item.status !== 'success').length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload {items.filter(item => !item.isServerFile && item.status !== 'success').length > 0 && `(${items.filter(item => !item.isServerFile && item.status !== 'success').length})`}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {isLoadingFiles ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading files...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files found.</p>
            {!isAdmin && (
              <p className="text-xs mt-2">Click "Add Files" to upload files</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%]">File Name</TableHead>
                    <TableHead className="w-[12%]">Type</TableHead>
                    <TableHead className="w-[10%]">Format</TableHead>
                    <TableHead className="w-[15%]">Date</TableHead>
                    <TableHead className="w-[12%]">Time</TableHead>
                    <TableHead className="w-[8%]">Size</TableHead>
                    <TableHead className="w-[8%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const getFileIcon = () => {
                      if (item.status === 'success') {
                        return <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                      }
                      if (item.status === 'uploading') {
                        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
                      }
                      if (item.status === 'error') {
                        return <X className="h-4 w-4 text-red-500 mr-2" />
                      }
                      return <FileText className="h-4 w-4 text-muted-foreground mr-2" />
                    }
                    
                    return (
                      <TableRow 
                        key={item.id}
                        className={
                          item.status === 'error' ? 'bg-red-50/50 dark:bg-red-950/10' : 
                          item.status === 'success' ? 'bg-green-50/50 dark:bg-green-950/10' : 
                          item.status === 'uploading' ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {getFileIcon()}
                            <span className="truncate">{item.filename}</span>
                          </div>
                          {item.status === 'uploading' && item.progress !== undefined && (
                            <div className="mt-1 w-full bg-muted rounded-full h-1.5">
                              <div 
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          )}
                          {item.status === 'error' && item.error && (
                            <div className="text-xs text-red-500 mt-1 truncate">
                              {item.error}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getFileType(item)}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs bg-muted rounded-md">
                            {getFileFormat(item.filename)}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(item.uploadedAt)}</TableCell>
                        <TableCell>{formatTime(item.uploadedAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatFileSize(item.fileSize)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isAdmin && item.isServerFile && item.serverFile && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePreview(item.serverFile!)}
                                  className="h-8 w-8 p-0"
                                  title="Preview"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownload(item.serverFile!)}
                                  className="h-8 w-8 p-0"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {!isAdmin && item.isServerFile && item.serverFile && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(item.serverFile!)}
                                className="h-8 w-8 p-0"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Delete"
                              disabled={item.status === 'uploading'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>

      {/* Preview Modal/Dialog */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{previewFile.filename}</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(previewFile)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (previewBlobUrl) {
                      window.URL.revokeObjectURL(previewBlobUrl)
                      setPreviewBlobUrl(null)
                    }
                    setPreviewFile(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {isLoadingPreview ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Loading preview...</p>
                </div>
              ) : previewFile.file_type?.startsWith('image/') ? (
                <img 
                  src={getPreviewUrl(previewFile)}
                  alt={previewFile.filename}
                  className="max-w-full h-auto mx-auto"
                  onError={(e) => {
                    console.error('Image load error:', e)
                    toast({
                      title: 'Preview Failed',
                      description: 'Could not load image. Please try downloading the file.',
                      variant: 'destructive',
                    })
                  }}
                />
              ) : previewFile.file_type === 'application/pdf' ? (
                <iframe
                  src={previewBlobUrl || getPreviewUrl(previewFile)}
                  className="w-full h-full min-h-[500px] border-0"
                  title={previewFile.filename}
                  onError={() => {
                    toast({
                      title: 'Preview Failed',
                      description: 'Could not load PDF. Please try downloading the file.',
                      variant: 'destructive',
                    })
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-16 w-16 mb-4 opacity-50" />
                  <p>Preview not available for this file type</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => handleDownload(previewFile)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default FilesTab

