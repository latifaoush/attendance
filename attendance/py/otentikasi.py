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
from unittest import result
import face_recognition
import cv2
import os
import uuid
from flask import Flask, jsonify, request, redirect, send_file, send_from_directory

from PIL import Image
from sklearn import svm
import pickle
import pymysql
from pymysql import Error
import numpy as np
import pymysql
import psycopg2
import psycopg2.extensions

# psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
# psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)

# connect to PostgreSQL
t_host = "103.127.99.237"  # this will be either "localhost", a domain name, or an IP address.
t_port = "54322"  # default port for postgres server
t_dbname = "pg_tot"
t_user = "usr_tot"
t_pw = "tot12345!!!123###"


# You can change this to any folder on your system
ALLOWED_EXTENSIONS = {"mp3", "wav", "png", "jpg", "jpeg", "gif"}
# train_dir = os.listdir(os.path.join(app.instance_path, 'uploads'))

app = Flask(__name__)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/daftar", methods=["GET", "POST"])
def daftar():
    if request.method == "POST":
        if "file" not in request.files:
            result = {"success": "false", "pesan": "Photo tidak ditemukan"}
            return jsonify(result)

        file = request.files["file"]
        user_id = request.form.get("user_id", "").strip()
        print(f"--> [DAFTAR] Menerima user_id: '{user_id}' | File: {file.filename}")

        if not user_id:
            return jsonify(
                {"success": "false", "pesan": "User ID tidak terdeteksi oleh server"}
            )

        if file.filename == "":
            return jsonify({"success": "false", "pesan": "File Tidak Berlabel"})

        if file and allowed_file(file.filename):
            return safe_faces_in_folder(file, user_id)

    return jsonify({"success": "false", "pesan": "Access Denied"})


def safe_faces_in_folder(file, user_id):
    face = face_recognition.load_image_file(file)

    face_locations = face_recognition.face_locations(
        face, number_of_times_to_upsample=1, model="hog"
    )

    if len(face_locations) == 0:
        print(
            f"--> [GAGAL] Wajah tidak terdeteksi pada gambar untuk user_id: {user_id}"
        )
        return jsonify({"success": "false", "pesan": "Wajah Tidak Terdeteksi"})

    uploads_dir = os.path.join(app.instance_path, "uploads")
    path = os.path.join(uploads_dir, user_id)
    os.makedirs(path, mode=0o777, exist_ok=True)

    top, right, bottom, left = face_locations[0]
    face_image = face[top:bottom, left:right]
    face_image_ok = Image.fromarray(face_image)

    filename = str(uuid.uuid4()) + ".jpg"
    path_file = os.path.join(path, filename)
    face_image_ok.save(path_file)

    save_pgsql_single(filename, face, face_locations, user_id)

    result = {
        "success": "true",
        "pesan": "Berhasil mendaftar",
        "user_id": user_id,
        "url_gambar": f"/showimage/{user_id}/{filename}",
    }
    return jsonify(result)


def save_pgsql_single(filename, face_array, face_bounding_boxes, user_id):
    if len(face_bounding_boxes) >= 1:
        try:
            # Skenario 1: Coba deteksi cepat menggunakan koordinat dari fungsi sebelumnya
            face_encs = face_recognition.face_encodings(
                face_array, known_face_locations=[face_bounding_boxes[0]]
            )

            # Skenario 2 (Fallback): Jika skenario 1 gagal/kosong, coba ekstraksi otomatis tanpa koordinat
            if len(face_encs) == 0:
                print(
                    f"--> [INFO] Percobaan pertama gagal, mencoba ekstraksi ulang tanpa bounding box untuk user {user_id}"
                )
                face_encs = face_recognition.face_encodings(face_array)

            if len(face_encs) == 0:
                print(f"Gagal melakukan ekstraksi encoding untuk user {user_id}")
                return

            face_enc = face_encs[0]
            face_pickled_data = pickle.dumps(face_enc)

            sql_insert = (
                """insert into facedata (filename, user_id, file) values (%s,%s,%s)"""
            )

            db_conn = psycopg2.connect(
                host=t_host, port=t_port, dbname=t_dbname, user=t_user, password=t_pw
            )
            db_cursor = db_conn.cursor()

            db_cursor.execute(sql_insert, (filename, user_id, face_pickled_data))
            db_conn.commit()
            db_cursor.close()
            db_conn.close()
            print(f"Berhasil menyimpan wajah ke PostgreSQL untuk user_id: {user_id}")
        except (Exception, psycopg2.DatabaseError) as error:
            print("Database Error:", error)
        finally:
            if "db_conn" in locals() and db_conn is not None:
                db_conn.close()


@app.route("/test", methods=["GET", "POST"])
def upload_image():
    # reload(sys)
    # sys.setdefaultencoding('utf-8')
    # Check if a valid image file was uploaded

    if request.method == "POST":
        if "file" not in request.files:
            return redirect(request.url)

        file = request.files["file"]
        user_id = request.form.get("user_id", "").strip()

        if not user_id:
            return jsonify({"success": "false", "pesan": "User ID tidak boleh kosong"})

        if file.filename == "":
            return redirect(request.url)

        if file and allowed_file(file.filename):
            return detect_faces_in_pgsql2(user_id, file)
    result = {"success": "false", "pesan": "File Tidak Valid"}
    return jsonify(result)


def detect_faces_in_pgsql2(user_id, file_stream):
    encodings = []
    names = []
    try:
        test_image = face_recognition.load_image_file(file_stream)
        face_locations = face_recognition.face_locations(
            test_image, number_of_times_to_upsample=0, model="hog"
        )
        no = len(face_locations)
        print("Number of faces detected: ", no)
        if no < 1:
            return jsonify({"success": "false", "pesan": "Face Not Detected"})
    except Exception as e:
        print(f"Error loading image: {e}")
        return jsonify({"success": "false", "pesan": "Face Not Detected"})

    connection = psycopg2.connect(
        host=t_host, port=t_port, dbname=t_dbname, user=t_user, password=t_pw
    )
    cursorparent = connection.cursor()
    cursor = connection.cursor()

    try:
        cursorparent.execute(
            """SELECT filename, user_id FROM facedata where user_id = %s""", [user_id]
        )
        rowsparent = cursorparent.fetchall()

        if not rowsparent:
            print(f"No registered face data found for user: {user_id}")
            return jsonify({"success": "false", "pesan": "User belum terdaftar"})

        for eachparent in rowsparent:
            filename = eachparent[0]
            cursor.execute(
                """SELECT file FROM facedata where filename = %s""", [filename]
            )
            rows = cursor.fetchall()
            for each in rows:
                if each[0]:  # Make sure data exists
                    face_data = pickle.loads(each[0])
                    encodings.append(face_data)

    except Exception as e:
        print(f"Database/Pickle Error: {e}")
        return jsonify({"success": "false", "pesan": "Gagal membaca database"})
    finally:
        if connection:
            cursor.close()
            cursorparent.close()
            connection.close()

    # Safety Check: Extract test image encodings securely
    test_encodings_list = face_recognition.face_encodings(test_image)
    if len(test_encodings_list) == 0:
        return jsonify(
            {"success": "false", "pesan": "Gagal mengekstrak encoding wajah"}
        )

    test_image_enc = test_encodings_list[0]

    # Safety Check: Check if database template records loaded successfully
    if len(encodings) == 0:
        return jsonify(
            {"success": "false", "pesan": "Data wajah terdaftar tidak valid"}
        )

    whois = "9E0D537CB97E54A2XXXX"

    for face_encoding in encodings:
        face_distances = face_recognition.face_distance([test_image_enc], face_encoding)
        print(f"Face distance metric calculated: {face_distances}")

        if len(face_distances) > 0 and face_distances[0] < 0.5:
            whois = user_id
            print(f"MATCHING {whois}!")
            break

    user_id_cek = str(whois)
    if user_id == user_id_cek:
        result = {"success": "true", "pesan": user_id_cek}
    else:
        result = {"success": "false", "pesan": "Wajah Tidak Cocok"}

    print(result)
    return jsonify(result)


@app.route("/showimage/<user_id>/<filename>", methods=["GET"])
def tampilkan_gambar(user_id, filename):
    try:
        uploads_dir = os.path.join(app.instance_path, "uploads", user_id)

        return send_from_directory(uploads_dir, filename)

    except FileNotFoundError:
        return (
            jsonify({"success": "false", "pesan": "Gambar tidak ditemukan"}),
            404,
        )
    except Exception as e:
        return jsonify({"success": "false", "pesan": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
