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
        this.userName = '';
        
        // 스마트 분할 기능 속성들
        this.isChunkedRecording = false;
        this.currentSegment = 1;
        this.totalSegments = 0;
        this.segmentStartTime = null;
        this.completedSegments = [];
        this.maxSegmentDuration = 60 * 60 * 1000; // 1시간 (기본값)
        this.minSegmentDuration = 40 * 60 * 1000; // 40분 (최소값)
        this.memoryCheckInterval = null;
        this.segmentTimer = null;
        this.baseTimestamp = null;
        
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
        
        // 분할 녹화 UI 요소들
        this.chunkedRecordingInfo = document.getElementById('chunkedRecordingInfo');
        this.currentSegmentDisplay = document.getElementById('currentSegmentDisplay');
        this.totalTimeDisplay = document.getElementById('totalTimeDisplay');
        this.segmentTimeDisplay = document.getElementById('segmentTimeDisplay');
        this.completedFilesDisplay = document.getElementById('completedFilesDisplay');
        this.segmentProgress = document.getElementById('segmentProgress');
        this.progressText = document.getElementById('progressText');
        this.memoryWarning = document.getElementById('memoryWarning');
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
    }
    
    async startRecording() {
        try {
            // 이름 입력받기
            const userName = prompt('녹화 파일 이름을 입력하세요:', '');
            if (userName === null) return; // 취소시 녹화 중단
            
            this.userName = userName.trim() || 'unnamed';
            
            // 장시간 녹화 여부 확인
            const isLongRecording = confirm('1시간 이상 녹화하시겠습니까?\n\n"확인": 스마트 분할 녹화 (안전, 자동 파일 분할)\n"취소": 일반 녹화 (1시간 미만 권장)');
            this.isChunkedRecording = isLongRecording;
            
            if (this.isChunkedRecording) {
                const estimatedHours = prompt('예상 녹화 시간을 입력하세요 (시간 단위, 예: 7):', '2');
                this.totalSegments = Math.ceil(parseFloat(estimatedHours) || 2);
                this.showChunkedRecordingUI();
                this.baseTimestamp = this.getBaseTimestamp();
            }
            
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
            this.segmentStartTime = Date.now();
            this.startTimer();
            
            // 스마트 분할 기능 시작
            if (this.isChunkedRecording) {
                this.startMemoryMonitoring();
                this.startSegmentTimer();
                this.updateStatus(`세그먼트 ${this.currentSegment} 녹화 중`, true);
                this.updateChunkedUI();
            } else {
                this.updateStatus('녹화 중', true);
            }
            
        } catch (err) {
            console.error("녹화를 시작할 수 없습니다:", err);
            this.updateStatus('오류: ' + err.message, false);
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
            audio: true
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
            audio: true
        };
        
        this.screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        this.screenPreview.srcObject = this.screenStream;
        
        this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            if (this.isRecording) {
                this.stopRecording();
            }
        });
    }
    
    startWebcamRecording() {
        const options = {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 2000000 // 스마트 분할 시 메모리 절약을 위해 약간 낮춤
        };
        
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
            videoBitsPerSecond: 4000000 // 화면은 조금 더 높은 품질
        };
        
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
        this.stopChunkedRecording();
        
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
        
        if (this.isChunkedRecording) {
            this.updateStatus(`전체 녹화 완료! ${this.completedSegments.length + 1}개 세그먼트 저장됨`, false);
        } else {
            this.updateStatus('저장 중...', false);
        }
        
        this.resetUI();
    }
    
    // 스마트 분할 핵심 기능들
    startMemoryMonitoring() {
        this.memoryCheckInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, 10000); // 10초마다 체크
    }
    
    checkMemoryUsage() {
        if (!performance.memory) return;
        
        const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        const memoryLimit = performance.memory.jsHeapSizeLimit / 1024 / 1024; // MB
        const memoryPercentage = (memoryUsage / memoryLimit) * 100;
        
        // 메모리 사용량이 70% 이상이고, 최소 녹화 시간(40분)을 넘었으면 분할
        const segmentDuration = Date.now() - this.segmentStartTime;
        
        if (memoryPercentage > 70 && segmentDuration > this.minSegmentDuration) {
            this.showMemoryWarning();
            setTimeout(() => {
                this.triggerSegmentSplit('메모리 사용량 높음');
            }, 5000); // 5초 후 분할
        } else if (memoryPercentage > 60) {
            this.showMemoryWarning();
        } else {
            this.hideMemoryWarning();
        }
    }
    
    startSegmentTimer() {
        this.segmentTimer = setTimeout(() => {
            this.triggerSegmentSplit('최대 시간 도달');
        }, this.maxSegmentDuration);
    }
    
    async triggerSegmentSplit(reason) {
        if (!this.isRecording || !this.isChunkedRecording) return;
        
        console.log(`세그먼트 분할 실행: ${reason}`);
        this.updateStatus(`세그먼트 ${this.currentSegment} 완료 중... (${reason})`, true);
        
        // 현재 녹화 중지
        if (this.webcamRecorder && this.webcamRecorder.state === 'recording') {
            this.webcamRecorder.stop();
        }
        if (this.screenRecorder && this.screenRecorder.state === 'recording') {
            this.screenRecorder.stop();
        }
        
        // 잠시 대기 (파일 저장 시간)
        await this.sleep(1000);
        
        // 다음 세그먼트 준비
        this.completedSegments.push(this.currentSegment);
        this.currentSegment++;
        this.segmentStartTime = Date.now();
        
        // 세그먼트 타이머 재시작
        clearTimeout(this.segmentTimer);
        clearInterval(this.memoryCheckInterval);
        
        if (this.currentSegment <= this.totalSegments) {
            // 다음 세그먼트 시작
            this.webcamChunks = [];
            this.screenChunks = [];
            
            this.startWebcamRecording();
            this.startScreenRecording();
            this.startMemoryMonitoring();
            this.startSegmentTimer();
            
            this.updateStatus(`세그먼트 ${this.currentSegment} 녹화 중`, true);
            this.updateChunkedUI();
        } else {
            // 모든 세그먼트 완료
            this.stopRecording();
        }
    }
    
    saveWebcamVideo() {
        const filename = this.getSegmentFilename('webcam');
        const blob = new Blob(this.webcamChunks, { type: 'video/webm' });
        this.downloadFile(blob, filename);
        this.webcamChunks = [];
        
        console.log(`웹캠 파일 저장: ${filename}`);
    }
    
    saveScreenVideo() {
        const filename = this.getSegmentFilename('screen');
        const blob = new Blob(this.screenChunks, { type: 'video/webm' });
        this.downloadFile(blob, filename);
        this.screenChunks = [];
        
        console.log(`화면 파일 저장: ${filename}`);
        
        if (!this.isChunkedRecording) {
            this.updateStatus('저장 완료! 파일이 다운로드 되었습니다.', false);
            setTimeout(() => {
                this.updateStatus('준비됨', false);
            }, 3000);
        }
    }
    
    getSegmentFilename(type) {
        if (this.isChunkedRecording) {
            const segmentNumber = this.completedSegments.includes(this.currentSegment) ? 
                this.currentSegment : this.currentSegment;
            const paddedNumber = segmentNumber.toString().padStart(3, '0');
            return `${type}_${this.baseTimestamp}_${this.userName}_${paddedNumber}.webm`;
        } else {
            const timestamp = this.getTimestamp();
            return `${type}_${timestamp}.webm`;
        }
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
    
    getBaseTimestamp() {
        const now = new Date();
        return now.toLocaleString('ko-KR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(/[. :]/g, '').replace(/(\d{6})(\d{4})/, '$1_$2');
    }
    
    getTimestamp() {
        const now = new Date();
        const timestamp = now.toLocaleString('ko-KR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/[. :]/g, '').replace(/(\d{6})(\d{6})/, '$1_$2');
        
        return this.userName ? `${timestamp}_${this.userName}` : timestamp;
    }
    
    // UI 업데이트 함수들
    showChunkedRecordingUI() {
        if (this.chunkedRecordingInfo) {
            this.chunkedRecordingInfo.classList.add('active');
        }
    }
    
    updateChunkedUI() {
        if (!this.isChunkedRecording) return;
        
        const totalElapsed = Date.now() - this.startTime;
        const segmentElapsed = Date.now() - this.segmentStartTime;
        const segmentProgress = Math.min((segmentElapsed / this.maxSegmentDuration) * 100, 100);
        
        // 현재 세그먼트 표시
        if (this.currentSegmentDisplay) {
            this.currentSegmentDisplay.textContent = `${this.currentSegment} / ${this.totalSegments}`;
        }
        
        // 전체 시간 표시
        if (this.totalTimeDisplay) {
            this.totalTimeDisplay.textContent = this.formatTime(totalElapsed);
        }
        
        // 세그먼트 시간 표시
        if (this.segmentTimeDisplay) {
            this.segmentTimeDisplay.textContent = this.formatTime(segmentElapsed);
        }
        
        // 완료된 파일 수
        if (this.completedFilesDisplay) {
            this.completedFilesDisplay.textContent = `${this.completedSegments.length * 2}개`;
        }
        
        // 진행률 바
        if (this.segmentProgress) {
            this.segmentProgress.style.width = `${segmentProgress}%`;
        }
        
        // 진행률 텍스트
        if (this.progressText) {
            const segmentMin = Math.floor(segmentElapsed / 60000);
            const maxMin = Math.floor(this.maxSegmentDuration / 60000);
            this.progressText.textContent = `${Math.floor(segmentProgress)}% (${segmentMin}분 / ${maxMin}분)`;
        }
    }
    
    showMemoryWarning() {
        if (this.memoryWarning) {
            this.memoryWarning.classList.add('show');
        }
    }
    
    hideMemoryWarning() {
        if (this.memoryWarning) {
            this.memoryWarning.classList.remove('show');
        }
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
            
            // 분할 녹화 UI 업데이트
            if (this.isChunkedRecording) {
                this.updateChunkedUI();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.recordingTime.style.display = 'none';
    }
    
    stopChunkedRecording() {
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
            this.memoryCheckInterval = null;
        }
        if (this.segmentTimer) {
            clearTimeout(this.segmentTimer);
            this.segmentTimer = null;
        }
        if (this.chunkedRecordingInfo) {
            this.chunkedRecordingInfo.classList.remove('active');
        }
    }
    
    resetUI() {
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        
        // 분할 녹화 상태 초기화
        this.isChunkedRecording = false;
        this.currentSegment = 1;
        this.totalSegments = 0;
        this.completedSegments = [];
        this.hideMemoryWarning();
    }
    
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new DualRecorder();
});