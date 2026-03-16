<template>
  <div class="file-upload">
    <el-upload
      class="upload-area"
      drag
      action="#"
      :auto-upload="false"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      :file-list="fileList"
      :limit="1"
      :before-upload="beforeUpload"
    >
      <div class="upload-inner">
        <div class="upload-icon-wrap">
          <el-icon class="upload-icon"><upload-filled /></el-icon>
        </div>
        <div class="upload-text">
          将文件拖至此处，或 <em>点击选择</em>
        </div>
        <div class="upload-tip">
          支持 PDF · docx · pptx · xlsx · TXT · 代码 · ZIP，大小 ≤ 10 MB
        </div>
      </div>
    </el-upload>

    <!-- File Preview -->
    <div v-if="previewUrl" class="preview-panel">
      <div class="preview-header">
        <el-icon style="color:#059669"><document /></el-icon>
        <span>文件预览</span>
      </div>
      <div class="preview-body">
        <iframe v-if="isPdf" :src="previewUrl" width="100%" height="380px" style="border:none;border-radius:8px" />
        <div v-else class="non-pdf">
          <div class="file-type-icon">
            <el-icon style="font-size:48px;color:#2563EB"><document /></el-icon>
          </div>
          <div class="file-meta">
            <div class="file-name">{{ currentFile?.name }}</div>
            <div class="file-type">文件类型：{{ fileType }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Document } from '@element-plus/icons-vue'

interface FileInfo { name: string; size: number; type: string; raw: File }

const emit = defineEmits<{ fileSelected: [file: File]; fileRemoved: [] }>()

const fileList = ref<FileInfo[]>([])
const currentFile = ref<File | null>(null)
const previewUrl = ref<string>('')

const isPdf = computed(() => currentFile.value?.type === 'application/pdf')
const fileType = computed(() => {
  if (!currentFile.value) return ''
  return currentFile.value.type.split('/')[1]?.toUpperCase() || '未知类型'
})

const beforeUpload = (file: File) => {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip']
  if (!allowedTypes.includes(file.type)) { ElMessage.error('只能上传 pdf, doc, docx, zip 格式的文件!'); return false }
  if (file.size / 1024 / 1024 >= 10) { ElMessage.error('文件大小不能超过 10MB!'); return false }
  return false
}

const handleFileChange = (file: FileInfo) => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  currentFile.value = file.raw
  emit('fileSelected', file.raw)
  if (file.raw.type === 'application/pdf') previewUrl.value = URL.createObjectURL(file.raw)
}

const handleFileRemove = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  currentFile.value = null; previewUrl.value = ''; emit('fileRemoved')
}

onUnmounted(() => { if (previewUrl.value) URL.revokeObjectURL(previewUrl.value) })

defineExpose({
  getFile: () => currentFile.value,
  clearFile: () => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    fileList.value = []; currentFile.value = null; previewUrl.value = ''
  }
})
</script>

<style scoped>
.file-upload { width: 100%; }

.upload-area :deep(.el-upload) { width: 100%; }
.upload-area :deep(.el-upload-dragger) {
  border: 2px dashed #BFDBFE !important;
  border-radius: 12px !important;
  background: linear-gradient(135deg, #F8FAFF 0%, #F0FDF4 100%) !important;
  transition: all 0.2s ease;
  padding: 0;
}
.upload-area :deep(.el-upload-dragger:hover) {
  border-color: #2563EB !important;
  background: #EFF6FF !important;
}

.upload-inner {
  padding: 32px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.upload-icon-wrap {
  width: 64px; height: 64px;
  background: white; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(37,99,235,0.12);
  margin-bottom: 8px;
}
.upload-icon { font-size: 28px; color: #2563EB; }
.upload-text { font-size: 15px; color: #475569; }
.upload-text em { color: #2563EB; font-style: normal; font-weight: 600; }
.upload-tip { font-size: 12px; color: #94A3B8; }

.preview-panel {
  margin-top: 16px;
  background: white; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;
}
.preview-header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
  font-size: 14px; font-weight: 600; color: #475569;
}
.preview-body { padding: 16px; }
.non-pdf {
  display: flex; align-items: center; gap: 20px;
  background: #F8FAFC; border-radius: 10px; padding: 24px;
}
.file-name { font-size: 15px; font-weight: 600; color: #1E293B; word-break: break-all; }
.file-type { font-size: 13px; color: #94A3B8; margin-top: 4px; }
</style>
