import cv2
import os
import numpy as np
from PIL import Image
import sys

prevpath = 'C:/Users/WINDOWS8/Desktop/backup 24 11 18/alz/backend/Recognition/'
path = prevpath + 'samples'
recognizer = cv2.createLBPHFaceRecognizer()
detector = cv2.CascadeClassifier(
    prevpath + "haarcascade_frontalface_default.xml")
faceCascade = cv2.CascadeClassifier(
    prevpath + 'haarcascade_frontalface_default.xml')
imagePaths = [os.path.join(path, f) for f in os.listdir(path)]
sampleNum = 0
Id = str(sys.argv[1])

for imagePath in imagePaths:
    if(os.path.split(imagePath)[-1].split(".")[-1] != 'png'):
        continue
    image = cv2.imread(imagePath)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = faceCascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
        flags=cv2.cv.CV_HAAR_SCALE_IMAGE
    )
    for (x, y, w, h) in faces:
        cv2.rectangle(gray, (x, y), (x+w, y+h), (0, 255, 0), 2)
        sampleNum = sampleNum+1
        cv2.imwrite(prevpath + "dataSet/User."+Id + '.' +
                    str(sampleNum) + ".jpg", gray[y:y+h, x:x+w])
# aca empieza el entrenamiento del algoritmo


def getImagesAndLabels(path):
    imagePaths = [os.path.join(path, f) for f in os.listdir(path)]
    faceSamples = []
    Ids = []
    for imagePath in imagePaths:
        if(os.path.split(imagePath)[-1].split(".")[-1] != 'jpg'):
            continue
        pilImage = Image.open(imagePath).convert('L')
        imageNp = np.array(pilImage, 'uint8')
        Id = int(os.path.split(imagePath)[-1].split(".")[1])
        faces = detector.detectMultiScale(imageNp)
        for (x, y, w, h) in faces:
            faceSamples.append(imageNp[y:y+h, x:x+w])
            Ids.append(Id)
    return faceSamples, Ids


faces, Ids = getImagesAndLabels(prevpath + 'dataSet')
recognizer.train(faces, np.array(Ids))
recognizer.save(prevpath + 'trainner/trainner.yml')
print('Listo!')
