"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, Trash2, X, CheckCircle2, Loader2, ExternalLink } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { getUserData, isAuthenticated, uploadFilesToServer, getUploadedFiles, deleteUploadedFile, type UploadResponse } from "@/lib/api/index"

type UploadItem = {
  id: string
  file?: File // Optional for server files
  serverFile?: UploadResponse // Server file data
  filename: string
  fileType?: string
  fileSize: number
  uploadedAt: number | string // timestamp or ISO string
  status?: 'pending' | 'uploading' | 'success' | 'error'
  progress?: number
  error?: string
  isServerFile?: boolean // Flag to distinguish server files
}

export default function UploadsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [items, setItems] = useState<UploadItem[]>([])
  const [serverFiles, setServerFiles] = useState<UploadResponse[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const user = useMemo(() => getUserData(), [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }
    // Allow all authenticated users to access uploads; client users land here by default.
    setIsCheckingAuth(false)
    // Fetch uploaded files from server
    fetchServerFiles()
  }, [router])

  const fetchServerFiles = async () => {
    setIsLoadingFiles(true)
    try {
      const files = await getUploadedFiles()
      setServerFiles(files)
    } catch (error: any) {
      console.error('Failed to fetch uploaded files:', error)
      // Don't show error toast on initial load, just log it
      if (serverFiles.length === 0) {
        // Only show error if we're not just refreshing
      }
    } finally {
      setIsLoadingFiles(false)
    }
  }

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed")
    if (savedState !== null) setSidebarCollapsed(savedState === "true")
  }, [])

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkIsDesktop()
    window.addEventListener("resize", checkIsDesktop)
    return () => window.removeEventListener("resize", checkIsDesktop)
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  // Convert server files to UploadItem format and merge with local items (backend returns fileName, date, time, format, previewUrl)
  useEffect(() => {
    const serverItems: UploadItem[] = serverFiles.map((file: any) => {
      const fileName = file.fileName ?? file.filename ?? ''
      const date = file.date ?? ''
      const time = file.time ?? ''
      const uploadedAt = date && time ? `${date}T${time}` : (file.uploaded_at ?? Date.now())
      return {
        id: `server-${file.id}`,
        filename: fileName,
        fileSize: file.file_size ?? 0,
        uploadedAt,
        fileType: file.file_type ?? (file.format ? `application/${file.format}` : undefined),
        serverFile: { ...file, fileName, previewUrl: file.previewUrl ?? file.viewUrl ?? file.downloadUrl },
        status: 'success' as const,
        isServerFile: true,
      }
    })
    
    // Merge: keep local items, add/update server items
    setItems(prev => {
      const localItems = prev.filter(item => !item.isServerFile)
      const existingServerIds = new Set(prev.filter(item => item.isServerFile).map(item => item.id))
      const newServerItems = serverItems.filter(item => !existingServerIds.has(item.id))
      return [...localItems, ...serverItems]
    })
  }, [serverFiles])

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed)

  // Helper functions for file information
  const getFileFormat = (fileName: string | undefined): string => {
    if (fileName == null || fileName === '') return 'UNKNOWN'
    const extension = fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN'
    return extension
  }

  const getFileType = (item: UploadItem): string => {
    // For server files, use file_type from backend
    if (item.isServerFile && item.serverFile?.file_type) {
      const typeParts = item.serverFile.file_type.split('/')
      return typeParts[0].charAt(0).toUpperCase() + typeParts[0].slice(1) || 'Unknown'
    }
    // For local files, use File object
    if (item.file?.type) {
      const typeParts = item.file.type.split('/')
      return typeParts[0].charAt(0).toUpperCase() + typeParts[0].slice(1) || 'Unknown'
    }
    // Fallback: determine from extension
    const filename = item.filename ?? item.serverFile?.fileName ?? item.file?.name ?? ''
    const extension = filename.split('.').pop()?.toLowerCase() || ''
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

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const onPickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const acceptedFiles: File[] = []
    const rejectedFiles: string[] = []
    
    // Validate file sizes (accept all file types)
    const maxSize = 50 * 1024 * 1024 // 50MB per file
    
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

  const removeItem = async (id: string) => {
    const item = items.find((x) => x.id === id)
    
    // If it's a server file, delete from backend
    if (item?.isServerFile && item.serverFile) {
      try {
        await deleteUploadedFile(item.serverFile.id)
        setServerFiles(prev => prev.filter(f => f.id !== item.serverFile!.id))
        setItems(prev => prev.filter((x) => x.id !== id))
        toast({
          title: 'File Deleted',
          description: `${item.filename ?? item.serverFile?.fileName ?? item.file?.name ?? 'File'} has been deleted from the server.`,
          variant: 'default',
        })
      } catch (error: any) {
        console.error('Delete error:', error)
        toast({
          title: 'Delete Failed',
          description: error?.detail || error?.message || 'Failed to delete file from server.',
          variant: 'destructive',
        })
      }
    } else {
      // Local file, just remove from queue
      setItems((prev) => prev.filter((x) => x.id !== id))
      if (item) {
        toast({
          title: 'File Removed',
          description: `${item.filename ?? item.serverFile?.fileName ?? item.file?.name ?? 'File'} has been removed from the queue.`,
          variant: 'default',
        })
      }
    }
  }

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
    
    // Update all items to uploading status
    setItems(prev => prev.map(item => 
      pendingItems.some(p => p.id === item.id) 
        ? { ...item, status: 'uploading' as const, progress: 0 }
        : item
    ))

    try {
      await uploadFilesToServer(
        filesToUpload,
        undefined, // No client_id for general uploads page
        (progress) => {
          // Update progress for all uploading items
          setItems(prev => prev.map(item => 
            item.status === 'uploading' 
              ? { ...item, progress }
              : item
          ))
        }
      )
      
      // Mark all as successful and remove from local items (they'll be in server files now)
      setItems(prev => prev.filter(item => !pendingItems.some(p => p.id === item.id)))
      
      // Refresh server files list
      await fetchServerFiles()
      
      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${filesToUpload.length} file(s).`,
        variant: 'success',
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      
      // Mark all as error
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

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} collapsed={sidebarCollapsed} />
      <div
        className="flex flex-col flex-1 transition-all duration-300 overflow-hidden min-w-0"
        style={{
          marginLeft: isDesktop ? (sidebarCollapsed ? "60px" : "15%") : "0",
          width: isDesktop ? (sidebarCollapsed ? "calc(100% - 60px)" : "calc(100% - 15%)") : "100%",
        }}
      >
        <Header onMenuClick={() => setMobileMenuOpen(true)} onSidebarToggle={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        <div className="overflow-auto" style={{ height: "calc(100vh - 3vh)", marginTop: "3vh" }}>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Uploads</h2>
              <div className="text-xs text-muted-foreground ml-2">
                {user?.role === "client" ? "Client portal" : "Internal"}
              </div>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    Upload documents, PDFs, images, office files, and more. All file formats are supported (max 50MB per file).
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        onPickFiles(e.target.files)
                        // Reset input to allow selecting the same file again
                        if (e.target) {
                          e.target.value = ''
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add files
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleUpload}
                      disabled={items.filter(item => !item.isServerFile && item.status !== 'success').length === 0}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload {items.filter(item => !item.isServerFile && item.status !== 'success').length > 0 && `(${items.filter(item => !item.isServerFile && item.status !== 'success').length})`}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={fetchServerFiles}
                      disabled={isLoadingFiles}
                    >
                      {isLoadingFiles ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                    {items.filter(item => !item.isServerFile).length > 0 && (
                      <Button 
                        type="button" 
                        variant="ghost"
                        onClick={() => setItems(prev => prev.filter(item => item.isServerFile))}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear local
                      </Button>
                    )}
                  </div>
                </div>

                {items.length === 0 && !isLoadingFiles ? (
                  <div className="border border-dashed rounded-md p-6 text-center text-muted-foreground">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No files found.</p>
                    <p className="text-xs mt-1">Click "Add files" to select files to upload</p>
                  </div>
                ) : isLoadingFiles ? (
                  <div className="border border-dashed rounded-md p-6 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
                    <p>Loading files...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Table View */}
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40%]">File Name</TableHead>
                            <TableHead className="w-[15%]">Type</TableHead>
                            <TableHead className="w-[10%]">Format</TableHead>
                            <TableHead className="w-[15%]">Date</TableHead>
                            <TableHead className="w-[10%]">Time</TableHead>
                            <TableHead className="w-[10%] text-right">Actions</TableHead>
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
                                    <span className="truncate">{item.filename ?? item.serverFile?.fileName ?? item.file?.name ?? '—'}</span>
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
                                    {getFileFormat(item.filename ?? item.serverFile?.fileName ?? item.file?.name)}
                                  </span>
                                </TableCell>
                                <TableCell>{formatDate(item.uploadedAt)}</TableCell>
                                <TableCell>{formatTime(item.uploadedAt)}</TableCell>
                                <TableCell className="text-right">
                                  {(item.serverFile?.previewUrl ?? item.serverFile?.viewUrl ?? item.serverFile?.downloadUrl) && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(item.serverFile?.previewUrl ?? item.serverFile?.viewUrl ?? item.serverFile?.downloadUrl, '_blank', 'noopener')}
                                      title="Preview"
                                      className="mr-1"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(item.id)}
                                    className="text-destructive hover:text-destructive"
                                    title="Remove"
                                    disabled={item.status === 'uploading'}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

