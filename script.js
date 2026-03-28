const video = document.getElementById("video");

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
  faceapi.nets.faceExpressionNet.loadFromUri("./models"),
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices
    .getUserMedia({ video: {} })
    .then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadedmetadata", () => {
        const container = document.querySelector(".video-container");
        video.width = container.clientWidth;
        video.height = container.clientHeight;
      });
    })
    .catch((err) => console.error(err));
}

video.addEventListener("play", () => {
  const container = document.querySelector(".video-container");
  const canvas = faceapi.createCanvasFromMedia(video);
  container.append(canvas);

  // ใช้ขนาดของ video แทน เพราะ video จับขนาดที่แสดงบนหน้าจอ
  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight,
  };
  faceapi.matchDimensions(canvas, displaySize);
  const ctx = canvas.getContext("2d");

  const frameWidth = 300;
  const frameHeight = 400;
  const frameX = (displaySize.width - frameWidth) / 2;
  const frameY = (displaySize.height - frameHeight) / 3;

  let stableStartTime = null;
  const stableDuration = 1500;

  async function detectFace() {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ctx.strokeStyle = "blue";
    // ctx.lineWidth = 3;
    // ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);

    // faceapi.draw.drawDetections(canvas, resizedDetections);
    // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    // faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    if (resizedDetections.length > 0) {
      const detection = resizedDetections[0];
      const box = resizedDetections[0].detection.box;

      // ตรวจสอบว่าโครงใบหน้าทั้งหมดอยู่ภายใน blue frame
      if (
        box.x >= frameX &&
        box.y >= frameY &&
        box.x + box.width <= frameX + frameWidth &&
        box.y + box.height <= frameY + frameHeight
      ) {
        const landmarks = detection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const leftEyeX =
          leftEye.reduce((sum, pt) => sum + pt.x, 0) / leftEye.length;
        const rightEyeX =
          rightEye.reduce((sum, pt) => sum + pt.x, 0) / rightEye.length;
        const eyeMidX = (leftEyeX + rightEyeX) / 2;
        const noseTip = landmarks.positions[30];
        const diff = Math.abs(noseTip.x - eyeMidX);
        const orientationThreshold = 10;

        if (diff <= orientationThreshold) {
          if (!stableStartTime) {
            stableStartTime = performance.now();
          } else {
            const elapsed = performance.now() - stableStartTime;
            const progressPercent = Math.min(
              (elapsed / stableDuration) * 100,
              100
            );

            // ctx.font = "30px Arial";
            // ctx.fillStyle = "green";
            if (progressPercent < 100) {
              document
                .querySelector(".face-overlay")
                .classList.remove("success");
              document.querySelector(".face-overlay").classList.add("loading");
              // ctx.fillText(
              //   `${progressPercent.toFixed(0)}%`,
              //   frameX + 10,
              //   frameY + 40
              // );
            } else {
              document.querySelector(".face-overlay").classList.add("success");
              document
                .querySelector(".face-overlay")
                .classList.remove("loading");
              document.querySelector(".load").style.display = "flex";
              setTimeout(() => {
                document.querySelector(".success_status").style.display =
                  "block";
                document.querySelector(".success_status").style.opacity = "1";
                document.querySelector(".lds-dual-ring").style.display = "none";
              }, 3000);

              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const stream = video.srcObject;

              const imageData = canvas.toDataURL("image/png");
              stream.getTracks().forEach((track) => track.stop());
              fetch("upload.php", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ image: imageData }),
              })
                .then((response) => response.json())
                .then((data) => console.log(data))
                .catch((err) => console.error(err));

              if (stream) {
                setTimeout(() => {
                  stream.getTracks().forEach((track) => track.stop());
                  video.srcObject = null;
                }, 1000);
              }

              cancelAnimationFrame(animationFrameId);
              video.pause();
            }

            // ถ้าเวลาที่ผ่านมามากกว่า duration แสดงว่าหน้าอยู่ตรงกลางและนิ่งพอ
            // if (performance.now() - stableStartTime >= stableDuration) {
            //   ctx.font = "30px Arial";
            //   ctx.fillStyle = "green";
            //   ctx.fillText("Success");
            // }
          }
        } else {
          stableStartTime = null;
          document
            .querySelector(".face-overlay")
            .classList.remove("success", "loading");
        }
      } else {
        stableStartTime = null;
        document
          .querySelector(".face-overlay")
          .classList.remove("success", "loading");
      }
    } else {
      stableStartTime = null;
      document
        .querySelector(".face-overlay")
        .classList.remove("success", "loading");
    }

    animationFrameId = requestAnimationFrame(detectFace);
  }
  detectFace();
});
