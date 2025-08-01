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
    
    saveWebcamVideo() {
        const timestamp = this.getTimestamp();
        const blob = new Blob(this.webcamChunks, { type: 'video/webm' });
        this.downloadFile(blob, `webcam_${timestamp}.webm`);
        this.webcamChunks = [];
    }
    
    saveScreenVideo() {
        const timestamp = this.getTimestamp();
        const blob = new Blob(this.screenChunks, { type: 'video/webm' });
        this.downloadFile(blob, `screen_${timestamp}.webm`);
        this.screenChunks = [];
        
        // 모든 파일 저장 완료
        this.updateStatus('저장 완료! 파일이 다운로드 되었습니다.', false);
        setTimeout(() => {
            this.updateStatus('준비됨', false);
        }, 3000);
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

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new DualRecorder();
});