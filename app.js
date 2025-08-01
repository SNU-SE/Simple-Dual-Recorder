class DualRecorder {
    constructor() {
        this.webcamStream = null;
        this.screenStream = null;
        this.webcamRecorder = null;
        this.screenRecorder = null;
        this.webcamChunks = [];
        this.screenChunks = [];
        this.isRecording = false;
        this.startTime = null;
        this.timerInterval = null;
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.webcamPreview = document.getElementById('webcamPreview');
        this.screenPreview = document.getElementById('screenPreview');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.recordingTime = document.getElementById('recordingTime');
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
    }
    
    async startRecording() {
        try {
            this.updateStatus('준비 중...', false);
            
            // 웹캠 스트림 설정
            await this.setupWebcam();
            
            // 화면 공유 스트림 설정
            await this.setupScreen();
            
            // 녹화 시작
            this.startWebcamRecording();
            this.startScreenRecording();
            
            // UI 업데이트
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.isRecording = true;
            this.startTime = Date.now();
            this.startTimer();
            
            this.updateStatus('녹화 중', true);
            
        } catch (error) {
            console.error('녹화 시작 중 오류:', error);
            this.updateStatus('오류: ' + error.message, false);
            this.resetUI();
        }
    }
    
    async setupWebcam() {
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: true // 웹캠에서 오디오도 녹음
        };
        
        this.webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.webcamPreview.srcObject = this.webcamStream;
    }
    
    async setupScreen() {
        const displayMediaOptions = {
            video: {
                cursor: "always",
                displaySurface: "monitor"
            },
            audio: true // 시스템 오디오도 녹음 (브라우저 지원 시)
        };
        
        this.screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        this.screenPreview.srcObject = this.screenStream;
        
        // 사용자가 화면 공유를 중지했을 때 자동으로 녹화 중지
        this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            if (this.isRecording) {
                this.stopRecording();
            }
        });
    }
    
    startWebcamRecording() {
        const options = {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 2500000 // 2.5 Mbps
        };
        
        // 브라우저 호환성 체크
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm';
        }
        
        this.webcamRecorder = new MediaRecorder(this.webcamStream, options);
        
        this.webcamRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.webcamChunks.push(event.data);
            }
        };
        
        this.webcamRecorder.onstop = () => {
            this.saveWebcamVideo();
        };
        
        this.webcamRecorder.start();
    }
    
    startScreenRecording() {
        const options = {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 5000000 // 5 Mbps (화면은 더 높은 품질)
        };
        
        // 브라우저 호환성 체크
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm';
        }
        
        this.screenRecorder = new MediaRecorder(this.screenStream, options);
        
        this.screenRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.screenChunks.push(event.data);
            }
        };
        
        this.screenRecorder.onstop = () => {
            this.saveScreenVideo();
        };
        
        this.screenRecorder.start();
    }
    
    stopRecording() {
        this.isRecording = false;
        this.stopTimer();
        
        // 스트림 정지
        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
        }
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
        }
        
        // 녹화 중지
        if (this.webcamRecorder && this.webcamRecorder.state !== 'inactive') {
            this.webcamRecorder.stop();
        }
        if (this.screenRecorder && this.screenRecorder.state !== 'inactive') {
            this.screenRecorder.stop();
        }
        
        // 미리보기 초기화
        this.webcamPreview.srcObject = null;
        this.screenPreview.srcObject = null;
        
        this.updateStatus('저장 중...', false);
        this.resetUI();
    }
    
    async saveWebcamVideo() {
        const timestamp = this.getTimestamp();
        const blob = new Blob(this.webcamChunks, { type: 'video/webm' });
        const filename = `webcam_${timestamp}.webm`;
        
        // 로컬 다운로드
        this.downloadFile(blob, filename);
        
        // Google Drive 업로드 (가능한 경우)
        if (window.driveManager && window.driveManager.canUpload()) {
            try {
                this.updateStatus('Google Drive에 웹캠 영상 업로드 중...', false);
                await window.driveManager.uploadFile(blob, filename);
                console.log('웹캠 영상 Google Drive 업로드 완료');
            } catch (error) {
                console.error('웹캠 영상 Google Drive 업로드 실패:', error);
                this.showUploadError('웹캠 영상', error.message);
            }
        }
        
        this.webcamChunks = [];
        this.checkAllUploadsComplete();
    }
    
    async saveScreenVideo() {
        const timestamp = this.getTimestamp();
        const blob = new Blob(this.screenChunks, { type: 'video/webm' });
        const filename = `screen_${timestamp}.webm`;
        
        // 로컬 다운로드
        this.downloadFile(blob, filename);
        
        // Google Drive 업로드 (가능한 경우)
        if (window.driveManager && window.driveManager.canUpload()) {
            try {
                this.updateStatus('Google Drive에 화면 영상 업로드 중...', false);
                await window.driveManager.uploadFile(blob, filename);
                console.log('화면 영상 Google Drive 업로드 완료');
            } catch (error) {
                console.error('화면 영상 Google Drive 업로드 실패:', error);
                this.showUploadError('화면 영상', error.message);
            }
        }
        
        this.screenChunks = [];
        this.checkAllUploadsComplete();
    }
    
    checkAllUploadsComplete() {
        // 두 파일이 모두 처리되었는지 확인
        if (this.webcamChunks.length === 0 && this.screenChunks.length === 0) {
            const driveConnected = window.driveManager && window.driveManager.canUpload();
            const message = driveConnected 
                ? '저장 및 Google Drive 업로드 완료!' 
                : '저장 완료! 파일이 다운로드 되었습니다.';
            
            this.updateStatus(message, false);
            setTimeout(() => {
                this.updateStatus('준비됨', false);
            }, 3000);
        }
    }
    
    showUploadError(fileType, errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1001;
            max-width: 300px;
        `;
        errorDiv.innerHTML = `
            <strong>⚠️ ${fileType} 업로드 실패</strong><br>
            <small>${errorMessage}</small>
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
    
    getTimestamp() {
        const now = new Date();
        return now.toLocaleString('ko-KR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/[. :]/g, '').replace(/(\d{6})(\d{6})/, '$1_$2');
    }
    
    updateStatus(text, isRecording) {
        this.statusText.textContent = text;
        this.statusIndicator.className = `status-indicator ${isRecording ? 'status-recording' : 'status-stopped'}`;
    }
    
    startTimer() {
        this.recordingTime.style.display = 'block';
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.recordingTime.style.display = 'none';
    }
    
    resetUI() {
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
    }
}

// Google Drive 관리 클래스
class GoogleDriveManager {
    constructor() {
        this.isSignedIn = false;
        this.CLIENT_ID = ''; // 사용자가 설정할 Google OAuth 클라이언트 ID
        this.API_KEY = ''; // 사용자가 설정할 Google API 키
        this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
        
        this.sharedDriveId = localStorage.getItem('sharedDriveId') || '';
        this.folderName = localStorage.getItem('folderName') || 'Recordings';
        this.folderId = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadConfig();
    }
    
    initializeElements() {
        this.modal = document.getElementById('driveModal');
        this.driveSettingsBtn = document.getElementById('driveSettingsBtn');
        this.closeBtn = this.modal.querySelector('.close');
        this.connectBtn = document.getElementById('connectDriveBtn');
        this.saveConfigBtn = document.getElementById('saveDriveConfigBtn');
        this.disconnectBtn = document.getElementById('disconnectDriveBtn');
        this.driveStatus = document.getElementById('driveStatus');
        this.sharedDriveInput = document.getElementById('sharedDriveId');
        this.folderNameInput = document.getElementById('folderName');
    }
    
    bindEvents() {
        this.driveSettingsBtn.addEventListener('click', () => this.openModal());
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.connectBtn.addEventListener('click', () => this.connectGoogleDrive());
        this.saveConfigBtn.addEventListener('click', () => this.saveConfig());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        
        // 모달 외부 클릭시 닫기
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }
    
    openModal() {
        this.modal.style.display = 'block';
        this.updateStatus();
    }
    
    closeModal() {
        this.modal.style.display = 'none';
    }
    
    loadConfig() {
        this.sharedDriveInput.value = this.sharedDriveId;
        this.folderNameInput.value = this.folderName;
        
        // API 키가 설정되어 있으면 Google API 초기화
        if (this.CLIENT_ID && this.API_KEY) {
            this.initializeGoogleAPI();
        }
    }
    
    async initializeGoogleAPI() {
        try {
            await new Promise((resolve) => {
                gapi.load('auth2:client', resolve);
            });
            
            await gapi.client.init({
                apiKey: this.API_KEY,
                clientId: this.CLIENT_ID,
                discoveryDocs: [this.DISCOVERY_DOC],
                scope: this.SCOPES
            });
            
            const authInstance = gapi.auth2.getAuthInstance();
            this.isSignedIn = authInstance.isSignedIn.get();
            
            this.updateStatus();
        } catch (error) {
            console.error('Google API 초기화 실패:', error);
            this.updateStatus('Google API 설정이 필요합니다');
        }
    }
    
    async connectGoogleDrive() {
        if (!this.CLIENT_ID || !this.API_KEY) {
            alert('먼저 Google API 설정이 필요합니다.\n\n개발자에게 문의하여 CLIENT_ID와 API_KEY를 설정해주세요.');
            return;
        }
        
        try {
            const authInstance = gapi.auth2.getAuthInstance();
            await authInstance.signIn();
            this.isSignedIn = true;
            
            await this.setupSharedDrive();
            this.updateStatus();
        } catch (error) {
            console.error('Google Drive 연결 실패:', error);
            alert('Google Drive 연결에 실패했습니다: ' + error.message);
        }
    }
    
    async setupSharedDrive() {
        if (!this.sharedDriveId) {
            alert('공유 드라이브 ID를 입력해주세요');
            return;
        }
        
        try {
            // 공유 드라이브 내 폴더 확인/생성
            this.folderId = await this.ensureFolder();
            this.saveConfig();
        } catch (error) {
            console.error('공유 드라이브 설정 실패:', error);
            throw error;
        }
    }
    
    async ensureFolder() {
        try {
            // 기존 폴더 검색
            const searchResponse = await gapi.client.drive.files.list({
                q: `name='${this.folderName}' and parents='${this.sharedDriveId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                driveId: this.sharedDriveId,
                includeItemsFromAllDrives: true,
                supportsAllDrives: true,
                corpora: 'drive'
            });
            
            if (searchResponse.result.files.length > 0) {
                return searchResponse.result.files[0].id;
            }
            
            // 폴더가 없으면 생성
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: this.folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [this.sharedDriveId]
                },
                supportsAllDrives: true
            });
            
            return createResponse.result.id;
        } catch (error) {
            console.error('폴더 생성/검색 실패:', error);
            throw new Error('폴더 설정에 실패했습니다: ' + error.message);
        }
    }
    
    saveConfig() {
        this.sharedDriveId = this.sharedDriveInput.value.trim();
        this.folderName = this.folderNameInput.value.trim() || 'Recordings';
        
        localStorage.setItem('sharedDriveId', this.sharedDriveId);
        localStorage.setItem('folderName', this.folderName);
        
        this.updateStatus();
    }
    
    disconnect() {
        if (gapi.auth2) {
            gapi.auth2.getAuthInstance().signOut();
        }
        this.isSignedIn = false;
        this.folderId = null;
        this.updateStatus();
    }
    
    updateStatus() {
        if (!this.CLIENT_ID || !this.API_KEY) {
            this.driveStatus.innerHTML = `
                <p style="color: #dc3545;">⚠️ Google API 설정이 필요합니다</p>
                <small>개발자에게 문의하여 API 키를 설정해주세요</small>
            `;
            this.connectBtn.style.display = 'inline-block';
            this.saveConfigBtn.style.display = 'none';
            this.disconnectBtn.style.display = 'none';
        } else if (this.isSignedIn && this.sharedDriveId && this.folderId) {
            this.driveStatus.innerHTML = `
                <p style="color: #28a745;">✅ Google Drive에 연결됨</p>
                <small>공유 드라이브: ${this.sharedDriveId}</small><br>
                <small>폴더: ${this.folderName}</small>
            `;
            this.connectBtn.style.display = 'none';
            this.saveConfigBtn.style.display = 'inline-block';
            this.disconnectBtn.style.display = 'inline-block';
        } else if (this.isSignedIn) {
            this.driveStatus.innerHTML = `
                <p style="color: #ffc107;">⚠️ 공유 드라이브 설정 필요</p>
                <small>공유 드라이브 ID와 폴더명을 입력해주세요</small>
            `;
            this.connectBtn.style.display = 'none';
            this.saveConfigBtn.style.display = 'inline-block';
            this.disconnectBtn.style.display = 'inline-block';
        } else {
            this.driveStatus.innerHTML = `
                <p>Google Drive에 연결하여 녹화 파일을 자동 업로드하세요</p>
            `;
            this.connectBtn.style.display = 'inline-block';
            this.saveConfigBtn.style.display = 'none';
            this.disconnectBtn.style.display = 'none';
        }
    }
    
    async uploadFile(blob, filename) {
        if (!this.isSignedIn || !this.folderId) {
            throw new Error('Google Drive에 연결되지 않았습니다');
        }
        
        try {
            // 파일 메타데이터
            const metadata = {
                name: filename,
                parents: [this.folderId]
            };
            
            // FormData 생성
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            form.append('file', blob);
            
            // 업로드 요청
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
                method: 'POST',
                headers: new Headers({
                    'Authorization': `Bearer ${gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
                }),
                body: form
            });
            
            if (!response.ok) {
                throw new Error(`업로드 실패: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            throw error;
        }
    }
    
    canUpload() {
        return this.isSignedIn && this.folderId;
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.recorder = new DualRecorder();
    window.driveManager = new GoogleDriveManager();
});