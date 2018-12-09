import cv2
import sys
prevpath = 'C:/Users/WINDOWS8/Desktop/backup 24 11 18/alz/backend/Recognition/'
image = cv2.imread(prevpath + 'pictures/' + sys.argv[1])
recognizer = cv2.createLBPHFaceRecognizer()
recognizer.load(prevpath + 'trainner/trainner.yml')
cascadePath = prevpath + "haarcascade_frontalface_default.xml"
faceCascade = cv2.CascadeClassifier(cascadePath)
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
faces = faceCascade.detectMultiScale(gray, 1.2, 5)
Id = 0
if faces == ():
    print(Id)
else:
    for(x, y, w, h) in faces:
        pat, conf = recognizer.predict(gray[y:y+h, x:x+w])
        Id = pat
    print(Id)
