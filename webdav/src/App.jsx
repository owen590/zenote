import { useState, useEffect } from 'react'
import { createClient } from 'webdav'
import './App.css'

function App() {
  // 连接状态
  const [serverUrl, setServerUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [saveCredentials, setSaveCredentials] = useState(false) // 保存登录信息选项
  
  // 文件浏览
  const [currentPath, setCurrentPath] = useState('/')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  
  // 客户端实例
  const [client, setClient] = useState(null)
  
  // 页面加载时读取保存的登录信息
  useEffect(() => {
    const saved = localStorage.getItem('webdavCredentials')
    if (saved) {
      try {
        const credentials = JSON.parse(saved)
        setServerUrl(credentials.serverUrl || '')
        setUsername(credentials.username || '')
        setPassword(credentials.password || '')
        setSaveCredentials(true)
      } catch (error) {
        console.error('读取保存的登录信息失败:', error)
        localStorage.removeItem('webdavCredentials') // 清除损坏的存储
      }
    }
  }, [])

  // 连接到 WebDAV 服务器
  const connect = async () => {
    try {
      setLoading(true)
      
      let clientUrl = serverUrl;
      let isJianguoyun = serverUrl.includes('jianguoyun') || serverUrl === '/dav';
      
      // 坚果云特殊处理：使用正确的代理地址
      if (isJianguoyun) {
        // 直接使用配置好的代理地址
        clientUrl = '/dav';
        console.log('使用坚果云代理地址:', clientUrl);
      }
      
      // 坚果云需要特殊配置：应用密码而非登录密码
      const newClient = createClient(clientUrl, {
        username,
        password,
        // 坚果云兼容配置
        digest: false, // 坚果云使用基本认证
        basicAuth: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': '*/*',
          'Connection': 'keep-alive'
        }
      })
      
      // 测试连接：使用根目录
      console.log('测试连接到:', clientUrl);
      await newClient.getDirectoryContents('/')
      setClient(newClient)
      setIsConnected(true)
      
      // 保存登录信息
      if (saveCredentials) {
        localStorage.setItem('webdavCredentials', JSON.stringify({
          serverUrl,
          username,
          password
        }))
      } else {
        localStorage.removeItem('webdavCredentials')
      }
      
      setLoading(false)
    } catch (error) {
      console.error('连接失败:', error);
      setLoading(false)
      
      let errorMsg = '连接失败: ' + error.message;
      if (isJianguoyun) {
        errorMsg += '\n\n坚果云配置提示：\n1. 请使用应用密码而非登录密码\n2. 确保已在坚果云安全选项中生成应用密码\n3. 服务器 URL 请输入：/dav\n4. 检查用户名是否为正确的邮箱地址';
      }
      alert(errorMsg);
    }
  }
  
  // 清除保存的登录信息
  const clearSavedCredentials = () => {
    localStorage.removeItem('webdavCredentials')
    setSaveCredentials(false)
    setPassword('')
    alert('已清除保存的登录信息')
  }

  // 获取目录内容
  const getFiles = async (path = currentPath) => {
    try {
      setLoading(true)
      const contents = await client.getDirectoryContents(path)
      
      // 处理文件路径，确保格式正确
      const processedFiles = contents.map(file => {
        // 确保 filename 是相对路径，不是完整 URL
        let filename = file.filename;
        if (filename.startsWith('http://') || filename.startsWith('https://')) {
          // 如果是完整 URL，提取路径部分
          filename = new URL(filename).pathname;
        }
        
        return {
          ...file,
          filename: filename
        };
      });
      
      setFiles(processedFiles)
      setCurrentPath(path)
      setLoading(false)
    } catch (error) {
      console.error('获取文件失败:', error)
      setLoading(false)
      alert('获取文件失败: ' + error.message)
    }
  }

  // 上传文件
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    try {
      setLoading(true)
      
      // 读取文件内容为 ArrayBuffer，确保完整上传
      const reader = new FileReader()
      const fileContent = await new Promise((resolve, reject) => {
        reader.onload = (event) => resolve(event.target.result)
        reader.onerror = (error) => reject(error)
        reader.readAsArrayBuffer(file)
      })
      
      // 上传文件，使用 ArrayBuffer 确保完整传输
      await client.putFileContents(`${currentPath}/${file.name}`, fileContent, {
        overwrite: true,
        contentLength: file.size, // 明确指定文件大小
        headers: {
          'Content-Type': file.type || 'application/octet-stream' // 设置正确的 MIME 类型
        }
      })
      
      await getFiles()
      setLoading(false)
      alert('上传成功')
    } catch (error) {
      console.error('上传失败:', error)
      setLoading(false)
      alert('上传失败: ' + error.message)
    }
  }

  // 下载文件
  const downloadFile = async (file) => {
    try {
      setLoading(true)
      
      // 根据文件类型设置响应类型
      let responseType = 'blob';
      
      // 上传后无法直接预览，需要通过下载方式获取文件
      const content = await client.getFileContents(file.filename, { responseType })
      
      // 创建临时 URL 下载文件
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = file.basename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setLoading(false)
    } catch (error) {
      console.error('下载失败:', error)
      setLoading(false)
      alert('下载失败: ' + error.message)
    }
  }
  
  // 添加一个简单的文件类型图标映射
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return '🖼️';
    } else if (['txt', 'md', 'rtf'].includes(ext)) {
      return '📄';
    } else if (['pdf'].includes(ext)) {
      return '📕';
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return '📦';
    } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      return '📋';
    } else {
      return '📄';
    }
  }

  // 创建文件夹 - 使用自定义输入框替代 prompt()
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const createFolder = async () => {
    setShowCreateFolder(true)
  }

  const handleCreateFolderSubmit = async () => {
    if (!newFolderName.trim()) return
    
    try {
      setLoading(true)
      const folderName = newFolderName.trim()
      const folderPath = `${currentPath}/${folderName}`
      
      console.log('尝试创建文件夹:', folderPath);
      
      // 坚果云创建文件夹的特殊处理
      // 1. 先检查文件夹是否已存在
      const contents = await client.getDirectoryContents(currentPath);
      const folderExists = contents.some(item => 
        item.type === 'directory' && item.basename === folderName
      );
      
      if (folderExists) {
        alert('文件夹已存在');
        setLoading(false);
        return;
      }
      
      // 2. 坚果云特殊处理：直接使用客户端的 putFileContents 创建空文件
      // 这是坚果云 WebDAV 实现的一个变通方法
      await client.putFileContents(`${folderPath}/.empty`, '', {
        overwrite: true,
        headers: {
          'User-Agent': 'WebDAV-Client/1.0',
          'Content-Type': 'text/plain',
          'Depth': '1'
        }
      });
      
      await getFiles()
      setLoading(false)
      setShowCreateFolder(false)
      setNewFolderName('')
      alert('文件夹创建成功')
    } catch (error) {
      console.error('创建文件夹失败:', error);
      setLoading(false)
      
      // 为坚果云提供更详细的错误提示
      let errorMsg = '创建文件夹失败: ' + error.message
      if (error.message.includes('410 Gone')) {
        errorMsg += '\n\n坚果云提示：\n1. 请确保使用应用密码而非登录密码\n2. 确保已在坚果云安全选项中生成应用密码\n3. 检查 WebDAV 地址是否正确\n4. 尝试简化文件夹名称，避免特殊字符'
      }
      alert(errorMsg);
    }
  }

  // 删除文件/文件夹
  const deleteItem = async (item) => {
    if (!confirm(`确定要删除 ${item.basename} 吗？`)) return
    
    try {
      setLoading(true)
      if (item.type === 'directory') {
        await client.deleteDirectory(item.filename)
      } else {
        await client.deleteFile(item.filename)
      }
      await getFiles()
      setLoading(false)
      alert('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      setLoading(false)
      alert('删除失败: ' + error.message)
    }
  }

  // 导航到父目录
  const navigateUp = () => {
    if (currentPath === '/') return
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/'
    getFiles(parentPath)
  }

  // 连接后自动获取文件
  useEffect(() => {
    if (isConnected) {
      getFiles()
    }
  }, [isConnected])

  return (
    <div className="app">
      <h1>WebDAV 客户端</h1>
      
      {!isConnected ? (
        <div className="connection-form">
          <h2>连接到 WebDAV 服务器</h2>
          <div className="form-group">
            <label>服务器 URL:</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://example.com/webdav"
              required
            />
          </div>
          <div className="form-group">
            <label>用户名:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>密码:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="credentials-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={saveCredentials}
                onChange={(e) => setSaveCredentials(e.target.checked)}
              />
              保存登录信息
            </label>
            {saveCredentials && (
              <button className="clear-btn" onClick={clearSavedCredentials}>
                清除保存
              </button>
            )}
          </div>
          <div className="connection-buttons">
            <button onClick={connect} disabled={loading}>
              {loading ? '连接中...' : '连接'}
            </button>
          </div>
        </div>
      ) : (
        <div className="file-browser">
          <div className="header">
            <div className="path">
              <button onClick={navigateUp} disabled={currentPath === '/'}>
                ↑ 父目录
              </button>
              <span>{currentPath}</span>
            </div>
            <div className="actions">
              <button onClick={createFolder} disabled={loading}>
                创建文件夹
              </button>
              <label className="upload-btn">
                上传文件
                <input
                  type="file"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={loading}
                />
              </label>
            </div>
          </div>
          
          {/* 创建文件夹输入框 */}
          {showCreateFolder && (
            <div className="create-folder-modal">
              <div className="modal-content">
                <h3>创建文件夹</h3>
                <div className="form-group">
                  <label>文件夹名称:</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="输入文件夹名称"
                    autoFocus
                  />
                </div>
                <div className="modal-actions">
                  <button onClick={() => setShowCreateFolder(false)}>取消</button>
                  <button onClick={handleCreateFolderSubmit} disabled={loading}>
                    {loading ? '创建中...' : '创建'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <div className="files-list">
              {files.map((file) => (
                <div key={file.filename} className="file-item">
                  <div className="file-info">
                    <span className={`file-icon ${file.type}`}>
                      {file.type === 'directory' ? '📁' : getFileIcon(file.basename)}
                    </span>
                    <span className="file-name">
                      {file.type === 'directory' ? (
                        <button 
                          className="folder-btn" 
                          onClick={() => getFiles(file.filename)}
                        >
                          {file.basename}
                        </button>
                      ) : (
                        file.basename
                      )}
                    </span>
                    <span className="file-size">
                      {file.type !== 'directory' && `${(file.size / 1024).toFixed(2)} KB`}
                    </span>
                  </div>
                  <div className="file-actions">
                    {file.type !== 'directory' && (
                      <button onClick={() => downloadFile(file)}>下载</button>
                    )}
                    <button onClick={() => deleteItem(file)}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
