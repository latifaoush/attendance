# This is a _very simple_ example of a web service that recognizes faces in uploaded images.
# Upload an image file and it will check if the image contains a picture of Barack Obama.
# The result is returned as json. For example:
#
# $ curl -XPOST -F "file=@obama2.jpg" http://127.0.0.1:5001
#
# Returns:
#
# {
#  "face_found_in_image": true,
#  "is_picture_of_obama": true
# }
#
# This example is based on the Flask file upload example: http://flask.pocoo.org/docs/0.12/patterns/fileuploads/

# NOTE: This example requires flask to be installed! You can install it with pip:
# $ pip3 install flask
import sys
import face_recognition
import cv2
import os
import uuid
from flask import Flask, jsonify, request, redirect,send_file,send_from_directory

from PIL import Image
from sklearn import svm
import pickle
import pymysql
from pymysql import Error
import numpy as np
import pymysql
import psycopg2
import psycopg2.extensions
#psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
#psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)

# connect to PostgreSQL
t_host = "dwansoft.com" # this will be either "localhost", a domain name, or an IP address.
t_port = "5432" # default port for postgres server
t_dbname = "otentikasi2_db"
t_user = "postgres"
t_pw = "?s;]N2s7)U+7"



from pydub.silence import split_on_silence
import speech_recognition as sr
from pydub import AudioSegment
# You can change this to any folder on your system
ALLOWED_EXTENSIONS = {'mp3','wav','png', 'jpg', 'jpeg', 'gif'}
# train_dir = os.listdir(os.path.join(app.instance_path, 'uploads'))

app = Flask(__name__)


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/img', methods=['GET', 'POST'])
def send_image():
    if request.method == 'GET':
        file = request.values['file']
        nip = request.values['nip']
        uploads_dir = os.path.join(app.instance_path, 'uploads/')
        train_dir = os.listdir(os.path.join(app.instance_path, 'uploads/'))
        path = os.path.join(uploads_dir, nip)
        path_file = path+"/"+file
        print(path_file)
        #send_file(path_file)
        #path_file = '/opt/sisforten/instance/uploads/46A6E19025188CEDE421/'+file
    try:
        return send_file(path_file)
        #send_file(path_file)
        #send_from_directory(path_file, filename=file, as_attachment=True)
    except FileNotFoundError:
        abort(404)
    
@app.route('/uploadspeech', methods=['GET', 'POST'])
def uploadspeech():
    if request.method == 'POST':
        if 'file' not in request.files:
            result = {
                "success": "false",
                "pesan": "Sound tidak ditemukan"
            }
            return jsonify(result)

        file = request.files['file']
        nip = request.values['nip']
        tipe = request.values['tipe']
        if file.filename == '':
            result = {
                "success": "false",
                "pesan": "File Tidak Tidak Berlabel"
            }
            return jsonify(result)

        if file and allowed_file(file.filename):
            # nip = file.filename.replace(".jpg", "")
            uploads_dir = os.path.join(app.instance_path, 'sounds')
            path = os.path.join(uploads_dir, nip)
            os.makedirs(path, mode=0o777, exist_ok=True)
            namafile = nip+"."+ tipe
            path_file = path+"/"+namafile
            file.save((path_file))
            return convert_text(path, nip, tipe)
    return jsonify({
        "success": "false",
        "pesan": "Access Denied"
    })
    
@app.route('/convertspeech', methods=['GET', 'POST'])
def convertspeech():
    if request.method == 'POST':
        nip = request.values['nip']
        tipe = request.values['tipe']
        uploads_dir = os.path.join(app.instance_path, 'sounds')
        path = os.path.join(uploads_dir, nip)
        os.makedirs(path, mode=0o777, exist_ok=True)
        return convert_text(path, nip, tipe)
            
    return jsonify({
        "success": "false",
        "pesan": "Access Denied"
    })
    
def convert_text(path, filename, tipe):
    #path = path+"/"+filename
    namafile = filename+"."+ tipe
    namafilewav = filename+"."+ "wav"
    path_file = path+"/"+namafile
    path_file_wav = path+"/"+namafilewav
    file = path_file_wav
    
    if (tipe == "mp3"):
        audio_file = path_file
    #path.join(path.dirname(path.realpath(__file__)), filename+".mp3")
        print(audio_file)
        sound = AudioSegment.from_mp3(audio_file)
        sound.export(file, format="wav")
    
    fh = open(path + "/temp.txt", "w")
    song = AudioSegment.from_wav(file)
    #return (file);
    #sound = AudioSegment.from_mp3(src)
    #sound.export(dst, format="wav")
    # , min_silence_len=500, silence_thresh=-16
    #chunks = split_on_silence(song)
    # silence time:700ms and silence_dBFS<-70dBFS
    chunks = split_on_silence(
        song, min_silence_len=200, silence_thresh=-36)
    print(len(chunks))
    
    #try:
    #    os.mkdir('audio_chunks')
    #except(FileExistsError):
    #    pass

    # move into the directory to
    # store the audio files.
    #os.chdir('audio_chunks')
    isi = ""
    i = 0
    # process each chunk
    for chunk in chunks:
        chunk_silent = AudioSegment.silent(duration=10)
        audio_chunk = chunk_silent + chunk + chunk_silent
        print("saving chunk{0}.wav".format(i))
        audio_chunk.export(path + "/chunk{0}.wav".format(
            i), bitrate='192k', format="wav")
        filename = 'chunk'+str(i)+'.wav'
        print("Processing chunk "+str(i))
        file = path +"/"+filename
        #return (file);
        r = sr.Recognizer()

        # recognize the chunk
        with sr.AudioFile(file) as source:
            # remove this if it is not working
            # correctly.
            # r.adjust_for_ambient_noise(source)
            audio_listened = r.listen(source)

            try:
                rec = r.recognize_google(audio_listened, language="id-ID")
                print(rec+" ")
                fh.write(rec)
                isi += rec + ". "
            except sr.UnknownValueError:
                fh.write(" "+"...")
                print("Audio Tidak Terbaca")

        i += 1
        # os.chdir('..')
    fh.close()
    result = {
        "success": "true",
        "pesan": isi
    }
    return jsonify(result)
    
@app.route('/daftar', methods=['GET', 'POST'])
def daftar():
    if request.method == 'POST':
        if 'file' not in request.files:
            result = {
                "success": "false",
                "pesan": "Photo tidak ditemukan"
            }
            return jsonify(result)

        file = request.files['file']
        nip = request.values['nip']
        print("daftar nip %d, %s", nip, file)
        if file.filename == '':
            result = {
                "success": "false",
                "pesan": "File Tidak Tidak Berlabel"
            }
            return jsonify(result)

        if file and allowed_file(file.filename):
            # nip = file.filename.replace(".jpg", "")
            return safe_faces_in_folder(file, nip)

    return jsonify({
        "success": "false",
        "pesan": "Access Denied"
    })


def safe_faces_new(file, nip):
    face = face_recognition.load_image_file(file)
    face_locations = face_recognition.face_locations(
        face, number_of_times_to_upsample=0, model="hog")
    #face_locations = face_recognition.face_locations(face)
    if len(face_locations) == 0:
        result = {
            "success": 'false',
            "pesan": "No Face Found"
        }
        return jsonify(result)
    face_enc = face_recognition.face_encodings(face)[0]
    filename = str(uuid.uuid4())+".jpg"
    save_mysql_new(filename, face_enc, nip)
    result = {
        "success": 'true',
        "pesan": "" + nip + ""
    }
    return jsonify(result)


def safe_faces_in_folder(file, nip):
    face = face_recognition.load_image_file(file)
    face_locations = face_recognition.face_locations(
        face, number_of_times_to_upsample=0, model="hog")
    if len(face_locations) == 0:
        result = {
            "success": 'false',
            "pesan": "Wajah Tidak Terdeteksi"
        }
        return jsonify(result)
    for face_location in face_locations:
        # Print the location of each face in this image
        top, right, bottom, left = face_location
        #print("A face is located at pixel location Top: {}, Left: {}, Bottom: {}, Right: {}".format(top, left, bottom, right))

    # You can access the actual face itself like this:
        face_image = face[top:bottom, left:right]
        face_image_ok = Image.fromarray(face_image)
        uploads_dir = os.path.join(app.instance_path, 'uploads')
        path = os.path.join(uploads_dir, nip)
        os.makedirs(path, mode=0o777, exist_ok=True)
        filename = str(uuid.uuid4())+".jpg"
        path_file = path_file = path+"/"+filename
        status = face_image_ok.save(path_file)
        #save_mysql_single(filename, path_file, nip)
        save_pgsql_single(filename, path_file, nip)
        # face_image_ok.save("I:/"+nip+".jpg")
        # image = cv2.imread(filename)
        # image_gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # image_gray.save(filename)
        # cv2.imwrite(filename, image_gray)
    result = {
        "success": 'true',
        "pesan": "" + nip + ""
    }
    return jsonify(result)


def save_mysql_new(filename, face_enc, nip):
    face_pickled_data = pickle.dumps(face_enc)
    connection = pymysql.connect(host='94.237.74.123:3360', database='face', user='root',password='Gates12345!!!123!@#', charset='utf8', use_unicode=True)
    #connection = pymysql.connect('94.237.74.123:3360', 'root', '', 'face')
    cursor = connection.cursor()
    sql_insert = """insert into faces (filename,nip, data)
                    values (%s,%s,%s)"""

    try:
        affected_count = cursor.execute(sql_insert, (filename, nip, face_pickled_data))
        connection.commit()
        print("%d", affected_count)

    except Error as e:
        print("failed to insert values %d, %s", nip, filename)
    finally:
        if (connection):
            cursor.close()
            connection.close()


def save_mysql_single(filename, file, nip):
    print("failed to insert values %d, %s", nip, filename)
    face = face_recognition.load_image_file(file)
    face_bounding_boxes = face_recognition.face_locations(
        face, number_of_times_to_upsample=0, model="hog")

    # If training image contains exactly one face
    # filename = str(uuid.uuid4())+".jpg"
    if len(face_bounding_boxes) == 1:
        #face_enc = face_recognition.face_encodings(face, face_bounding_boxes)
        face_enc = face_recognition.face_encodings(face)[0]
        # face_enc = face_recognition.face_encodings(face)[0]
        face_pickled_data = pickle.dumps(face_enc)
        #connection = pymysql.connect('94.237.74.123:3360', 'root', '', 'face')
        connection = pymysql.connect(host='0.0.0.0:3360', database='face', user='root', password='Dwansoft12345!!!123', charset='utf8', use_unicode=True)
        cursor = connection.cursor()
        sql_insert = """insert into faces (filename,nip, data) values (%s,%s,%s)"""

        try:
            affected_count = cursor.execute(
                sql_insert, (filename, nip, face_pickled_data))
            connection.commit()
            print("%d", affected_count)

        except MySQLdb.Error:
            print("failed to insert values %d, %s", nip, filename)
        finally:
            if (connection):
                cursor.close()
                connection.close()
                
def save_pgsql_single(filename, file, nip):
    #print("failed to insert values %d, %s", nip, filename)
    face = face_recognition.load_image_file(file)
    face_bounding_boxes = face_recognition.face_locations(
        face, number_of_times_to_upsample=0, model="hog")
    # If training image contains exactly one face
    # filename = str(uuid.uuid4())+".jpg"
    if len(face_bounding_boxes) == 1:
        #face_enc = face_recognition.face_encodings(face, face_bounding_boxes)
        face_enc = face_recognition.face_encodings(face)[0]
        # face_enc = face_recognition.face_encodings(face)[0]
        face_pickled_data = pickle.dumps(face_enc)
        #connection = pymysql.connect('94.237.74.123:3360', 'root', '', 'face')
        #connection = pymysql.connect(host='0.0.0.0:3360', database='face', user='root', password='Dwansoft12345!!!123', charset='utf8', use_unicode=True)
        #cursor = connection.cursor()
       
        sql_insert = """insert into twajah (filename,pegawaiid,gambar) values (%s,%s,%s)"""
        #print(sql_insert)
        #print("insert values %d, %s", nip, filename)
        try:
            #db_cursor.execute(sql_insert, (filename, nip))
            db_conn = psycopg2.connect(host=t_host, port=t_port, dbname=t_dbname, user=t_user, password=t_pw)
            #db_conn.set_client_encoding('UTF8')
            db_cursor = db_conn.cursor()
            
            db_cursor.execute(sql_insert,(filename,nip,face_pickled_data))
            db_conn.commit()
            db_cursor.close()
            db_conn.close()
        except (Exception, psycopg2.DatabaseError) as error:
            # error occurred.
            print(error)
        finally:
            if db_conn is not None:
                db_conn.close()
        #try:
        #    affected_count = cursor.execute(
        #        sql_insert, (filename, nip, face_pickled_data))
        #    connection.commit()
        #    print("%d", affected_count)
        #except MySQLdb.Error:
        #   print("failed to insert values %d, %s", nip, filename)
        #finally:
        #    if (connection):
        #        cursor.close()
        #        connection.close()


def safe_faces_all_old(unknown_face_encodings, file, nip):
    face_locations = face_recognition.face_locations(
        file, number_of_times_to_upsample=0, model="hog")
    for face_location in face_locations:
        # Print the location of each face in this image
        top, right, bottom, left = face_location
        print("A face is located at pixel location Top: {}, Left: {}, Bottom: {}, Right: {}".format(
            top, left, bottom, right))

    # You can access the actual face itself like this:
        face_image = file[top:bottom, left:right]
        face_image_ok = Image.fromarray(face_image)
        uploads_dir = os.path.join(app.instance_path, 'uploads')
        path = os.path.join(uploads_dir, nip)
        os.makedirs(path, mode=0o777, exist_ok=True)
        filename = path+"/"+str(uuid.uuid4())+".jpg"
        status = face_image_ok.save(filename)
        # face_image_ok.save("I:/"+nip+".jpg")
        # image = cv2.imread(filename)
        # image_gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # image_gray.save(filename)
        # cv2.imwrite(filename, image_gray)
    result = {
        "success": 'true',
        "pesan": "" + nip + ""
    }
    return jsonify(result)


@ app.route('/generate', methods=['GET', 'POST'])
def generate():
    # Check if a valid image file was uploaded
    if request.method == 'POST':
        return safe_faces_loop_mysql()
    result = {
        "success": 'false',
        "pesan": "Generate Failed"
    }
    return jsonify(result)


def safe_faces_loop_mysql():
    encodings = []
    names = []
    uploads_dir = os.path.join(app.instance_path, 'uploads/')
    train_dir = os.listdir(os.path.join(app.instance_path, 'uploads/'))
    # faces, labels = prepare_training_data(uploads_dir)

    for person in train_dir:
        pix = os.listdir(uploads_dir + person)
        for person_img in pix:
            # Get the face encodings for the face in each image file
            face = face_recognition.load_image_file(
                uploads_dir + person + "/" + person_img)
            face_bounding_boxes = face_recognition.face_locations(
                face, number_of_times_to_upsample=0, model="hog")

            # If training image contains exactly one face
            if len(face_bounding_boxes) == 1:
                face_enc = face_recognition.face_encodings(face)[0]
                face_pickled_data = pickle.dumps(face_enc)
                connection = pymysql.connect(host='94.237.74.123:3360', database='face', user='root',password='Dwansoft12345!!!123', charset='utf8', use_unicode=True)
                cursor = connection.cursor()
                sql_insert = """insert into faces (filename,nip, data)
                values (%s,%s,%s)"""

                try:
                    affected_count = cursor.execute(
                        sql_insert, (person_img, person, face_pickled_data))
                    connection.commit()
                    print("%d %s", (affected_count, person_img))

                except Error:
                    print(
                        "failed to insert values %d, %s", person_img, person)
                finally:
                    if (connection):
                        cursor.close()
                        connection.close()
                # encodings.append(face_enc)
                # names.append(person)

    result = {
        "success": 'true',
        "pesan": "Success Generate Database"
    }
    return jsonify(result)


@ app.route('/test', methods=['GET', 'POST'])
def upload_image():
    # reload(sys)
    # sys.setdefaultencoding('utf-8')
    # Check if a valid image file was uploaded
    
    if request.method == 'POST':
        if 'file' not in request.files:
            return redirect(request.url)

        file = request.files['file']
        nip = request.values['nip']
        
        if file.filename == '':
            return redirect(request.url)

        if file and allowed_file(file.filename):
            # nip = file.filename.replace(".jpg", "")
            #result = {"success": 'false',"pesan": "Coba Aja"}
            #return jsonify(result)
            return detect_faces_in_pgsql2(nip, file)
			#return detect_faces_in_pgsql(nip, file)
            # return detect_faces_in_compare(nip, file)
            # return safe_faces_loop_mysql(nip, file)
            # return detect_faces_in_image(nip, file)
    result = {
        "success": 'false',
        "pesan": "File Tidak Valid"
    }
    return jsonify(result)
	
def detect_faces_in_compare(nip, file_stream):
    encodings = []
    names = []
    try:
        test_image = face_recognition.load_image_file(file_stream)
        # Find all the faces in the test image using the default HOG-based model
        face_locations = face_recognition.face_locations(
            test_image, number_of_times_to_upsample=0, model="hog")
        no = len(face_locations)
        print("Number of faces detected: ", no)
        if (no < 1):
            result = {
                "success": 'false',
                "pesan": "Face Not Detected"
            }
            return jsonify(result)
    except:
        result = {
            "success": 'false',
            "pesan": "Face Not Detected"
        }
        return jsonify(result)

    # Select what we just added
    connection = pymysql.connect(host='94.237.74.123:3360', database='face', user='root',
                                 password='Dwansoft12345!!!123', charset='utf8', use_unicode=True)
    #'94.237.74.123:3360', 'root', 'Dwansoft12345!!!123', 'face'
    cursorparent = connection.cursor()
    cursor = connection.cursor()

    try:
        cursorparent.execute(
            """SELECT filename,nip FROM faces where nip LIKE %s""", [nip])
        rowsparent = cursorparent.fetchall()
        for eachparent in rowsparent:

            filename = eachparent[0]
            nip_db = eachparent[1]
            names.append(filename)
            cursor.execute(
                """SELECT data FROM faces where filename LIKE %s""", [filename])
            rows = cursor.fetchall()
            for each in rows:
                for face_stored_pickled_data in each:
                    face_data = pickle.loads(face_stored_pickled_data)
                encodings.append((face_data))
    except Error as e:
        print(e)
    finally:
        if (connection):
            cursor.close()
            cursorparent.close()
            connection.close()

    whois = ''
    test_image_enc = face_recognition.face_encodings(test_image)[0]

    for face_encoding in encodings:
        match = face_recognition.compare_faces([test_image_enc], face_encoding)
        whois = "<Unknown Person>"

        if match[0]:
            whois = nip
        #print("I see someone named {}!".format(whois))

    nip_cek = str(whois)
    print(nip + "=" + nip_cek)
    if (nip == nip_cek):
        result = {
            "success": 'true',
            "pesan": "Face is " + nip
        }
    else:
        result = {
            "success": 'false',
            "pesan": "Face is Not " + nip
        }
    return jsonify(result)


def detect_faces_in_image(nip, file_stream):
    encodings = []
    names = []

    uploads_dir = os.path.join(app.instance_path, 'uploads/')
    train_dir = os.listdir(os.path.join(app.instance_path, 'uploads/'))
    for person in train_dir:
        pix = os.listdir(uploads_dir + person)
        for person_img in pix:
            # Get the face encodings for the face in each image file
            face = face_recognition.load_image_file(
                uploads_dir + person + "/" + person_img)
            face_bounding_boxes = face_recognition.face_locations(
                face, number_of_times_to_upsample=0, model="hog")
            # face_bounding_boxes = face_recognition.face_locations(
            #    face, number_of_times_to_upsample=0, model="hog")

            # If training image contains exactly one face
            if len(face_bounding_boxes) == 1:
                face_enc = face_recognition.face_encodings(face)[0]
                encodings.append(face_enc)
                names.append(person)
            else:
                print(person + "/" + person_img +
                      " was skipped and can't be used for training")

    # Create and train the SVC classifier
    recognizer = svm.SVC(gamma='scale')
    recognizer.fit(encodings, names)

    # Load the test image with unknown faces into a numpy array
    test_image = face_recognition.load_image_file(file_stream)

    # Find all the faces in the test image using the default HOG-based model
    # face_locations = face_recognition.face_locations(test_image)
    face_locations = face_recognition.face_locations(
        test_image, number_of_times_to_upsample=0, model="hog")
    no = len(face_locations)
    print("Number of faces detected: ", no)

    # Predict all the faces in the test image using the trained classifier
    print("Found:")
    whois = ''
    for i in range(no):
        test_image_enc = face_recognition.face_encodings(test_image)[i]
        name = recognizer.predict([test_image_enc])
        whois = name[0]
        #print(*name)

    if (nip == whois):
        result = {
            "success": 'true',
            "pesan": "" + whois
        }
    else:
        result = {
            "success": 'false',
            "pesan": whois
        }
    return jsonify(result)


def detect_faces_in_mysql(nip, file_stream):
    encodings = []
    names = []
    try:
        test_image = face_recognition.load_image_file(file_stream)
        # Find all the faces in the test image using the default HOG-based model
        face_locations = face_recognition.face_locations(
            test_image, number_of_times_to_upsample=0, model="hog")
        no = len(face_locations)
        print("Number of faces detected: ", no)
        if (no < 1):
            result = {
                "success": 'false',
                "pesan": "Face Not Detected"
            }
            return jsonify(result)
    except:
        result = {
            "success": 'false',
            "pesan": "Face Not Detected"
        }
        return jsonify(result)

    uploads_dir = os.path.join(app.instance_path, 'uploads/')
    train_dir = os.listdir(os.path.join(app.instance_path, 'uploads/'))
    # Select what we just added
    #connection = pymysql.connect('94.237.74.123:3360', 'root', 'Dwansoft12345!!!123', 'face')
    connection = pymysql.connect(host='94.237.74.123:3360', database='face', user='root',password='Dwansoft12345!!!123', charset='utf8', use_unicode=True)
    cursorparent = connection.cursor()
    cursor = connection.cursor()

    try:
        cursorparent.execute("""SELECT filename,nip FROM faces""")
        rowsparent = cursorparent.fetchall()
        for eachparent in rowsparent:

            filename = eachparent[0]
            nip_db = eachparent[1]
            names.append(filename)
            cursor.execute(
                """SELECT data FROM faces where filename LIKE %s""", [filename])
            rows = cursor.fetchall()
            for each in rows:
                for face_stored_pickled_data in each:
                    face_data = pickle.loads(face_stored_pickled_data)
                encodings.append((face_data))
    except Error as e:
        print(e)
    finally:
        if (connection):
            cursor.close()
            cursorparent.close()
            connection.close()

    # Dump the results to a string

    # Create and train the SVC classifier
    clf = svm.SVC(gamma='scale')
    clf.fit((encodings), (names))

    # Load the test image with unknown faces into a numpy array

    # Predict all the faces in the test image using the trained classifier
    print("Found:")
    whois = ''
    for i in range(no):
        test_image_enc = face_recognition.face_encodings(test_image)[i]
        name = clf.predict([test_image_enc])
        whois = name[0]
        #print(*name)

    filename_found = str(whois)
    #connection = pymysql.connect('94.237.74.123:3360', 'root', 'Dwansoft12345!!!123', 'face')
    connection = pymysql.connect(host='94.237.74.123:3360', database='face', user='root',password='Dwansoft12345!!!123', charset='utf8', use_unicode=True)
    cursor = connection.cursor()
    try:
        cursor.execute(
            """SELECT nip FROM faces where filename LIKE %s""", [filename_found])
        rows = cursor.fetchall()
        for row in rows:
            nip_cek = row[0]
    except Error as e:
        print(e)
    finally:
        cursor.close()
        connection.close()

    #print(nip + "=" + nip_cek)
    if (nip == nip_cek):
        result = {
            "success": 'true',
            "pesan": nip_cek
        }
    else:
        result = {
            "success": 'false',
            "pesan": nip_cek
        }
    print(result)
    return jsonify(result)

def detect_faces_in_pgsql(nip, file_stream):
    encodings = []
    names = []
    try:
        test_image = face_recognition.load_image_file(file_stream)
        # Find all the faces in the test image using the default HOG-based model
        face_locations = face_recognition.face_locations(test_image, number_of_times_to_upsample=0, model="hog")
		#face_locations = face_recognition.face_locations(test_image)
        no = len(face_locations)
        print("Number of faces detected: ", no)
        if (no < 1):
            result = {
                "success": 'false',
                "pesan": "Face Not Detected"
            }
            return jsonify(result)
    except:
        result = {
            "success": 'false',
            "pesan": "Face Not Detected"
        }
        return jsonify(result)

    uploads_dir = os.path.join(app.instance_path, 'uploads/')
    train_dir = os.listdir(os.path.join(app.instance_path, 'uploads/'))
    # Select what we just added
    #connection = pymysql.connect('94.237.74.123:3360', 'root', 'Dwansoft12345!!!123', 'face')
    
    connection = psycopg2.connect(host=t_host, port=t_port, dbname=t_dbname, user=t_user, password=t_pw)
    cursorparent = connection.cursor()
    cursor = connection.cursor()

    try:
        cursorparent.execute("""SELECT filename,pegawaiid FROM twajah""")
        rowsparent = cursorparent.fetchall()
        for eachparent in rowsparent:

            filename = eachparent[0]
            nip_db = eachparent[1]
            #print(filename)
            names.append(filename)
            cursor.execute(
                """SELECT gambar FROM twajah where filename LIKE %s""", [filename])
            rows = cursor.fetchall()
            for each in rows:
                for face_stored_pickled_data in each:
                    face_data = pickle.loads(face_stored_pickled_data)
                encodings.append((face_data))
    except Error as e:
        print(e)
    finally:
        if (connection):
            cursor.close()
            cursorparent.close()
            connection.close()

    # Dump the results to a string

    # Create and train the SVC classifier
    clf = svm.SVC(gamma='scale')
    clf.fit((encodings), (names))

    # Load the test image with unknown faces into a numpy array

    # Predict all the faces in the test image using the trained classifier
    print("Found:")
    whois = ''
    for i in range(no):
        test_image_enc = face_recognition.face_encodings(test_image)[i]
        name = clf.predict([test_image_enc])
        whois = name[0]
        #print(*name)

    filename_found = str(whois)
    #connection = pymysql.connect('94.237.74.123:3360', 'root', 'Dwansoft12345!!!123', 'face')
    connection = psycopg2.connect(host=t_host, port=t_port, dbname=t_dbname, user=t_user, password=t_pw)
    cursor = connection.cursor()
    try:
        cursor.execute(
            """SELECT pegawaiid FROM twajah where filename LIKE %s""", [filename_found])
        rows = cursor.fetchall()
        for row in rows:
            nip_cek = row[0]
            print(nip_cek)
    except Error as e:
        print(e)
    finally:
        cursor.close()
        connection.close()

    #print(nip + "=" + nip_cek)
    if (nip == nip_cek):
        result = {
            "success": 'true',
            "pesan": nip_cek
        }
    else:
        result = {
            "success": 'false',
            "pesan": nip_cek
        }
    print(result)
    return jsonify(result)

def detect_faces_in_pgsql2(nip, file_stream):
    encodings = []
    names = []
    try:
        test_image = face_recognition.load_image_file(file_stream)
        # Find all the faces in the test image using the default HOG-based model
        face_locations = face_recognition.face_locations(test_image, number_of_times_to_upsample=0, model="hog")
		#face_locations = face_recognition.face_locations(test_image)
        no = len(face_locations)
        print("Number of faces detected: ", no)
        if (no < 1):
            result = {
                "success": 'false',
                "pesan": "Face Not Detected"
            }
            return jsonify(result)
    except:
        result = {
            "success": 'false',
            "pesan": "Face Not Detected"
        }
        return jsonify(result)

    uploads_dir = os.path.join(app.instance_path, 'uploads/')
    train_dir = os.listdir(os.path.join(app.instance_path, 'uploads/'))
    # Select what we just added
    #connection = pymysql.connect('94.237.74.123:3360', 'root', 'Dwansoft12345!!!123', 'face')
    
    connection = psycopg2.connect(host=t_host, port=t_port, dbname=t_dbname, user=t_user, password=t_pw)
    cursorparent = connection.cursor()
    cursor = connection.cursor()

    try:
        cursorparent.execute("""SELECT filename,pegawaiid FROM twajah where pegawaiid = %s""",[nip])
        rowsparent = cursorparent.fetchall()
        for eachparent in rowsparent:
            filename = eachparent[0]
            nip_db = eachparent[1]
            #print(filename)
            names.append(filename)
            cursor.execute(
                """SELECT gambar FROM twajah where filename = %s""", [filename])
            rows = cursor.fetchall()
            for each in rows:
                for face_stored_pickled_data in each:
                    face_data = pickle.loads(face_stored_pickled_data)
                encodings.append((face_data))
    except Error as e:
        print(e)
    finally:
        if (connection):
            cursor.close()
            cursorparent.close()
            connection.close()
    #print("CEK DARI COMPARE:")
    test_image_enc = face_recognition.face_encodings(test_image)[0]
    whois = "9E0D537CB97E54A2XXXX"
    for face_encoding in encodings:
        #match = face_recognition.compare_faces([test_image_enc], face_encoding)
        face_distances = face_recognition.face_distance([test_image_enc], face_encoding)
        print(face_distances)
        
        whois = "9E0D537CB97E54A2XXXX"
        #print(match)
        #if match[0] and face_distances < 0.5:
        if face_distances < 0.5:
            whois = nip
            print("MATCHING {}!".format(whois))
            break

    nip_cek = str(whois)
    print(nip + "==" + nip_cek)
    if (nip == nip_cek):
        result = {
            "success": 'true',
            "pesan": nip_cek
        }
    else:
        result = {
            "success": 'true',
            "pesan": nip_cek
        }
    print(result);
    return jsonify(result)
	
if __name__ == "__main__":
    # app.run(host='0.0.0.0', port=5001, debug=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
