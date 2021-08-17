#!/usr/bin/python3.8

from flask import Flask, jsonify, render_template, request, redirect, make_response, url_for
import logging
import sys, os, traceback, requests
sys.path.insert(0, "{}/crawler".format(os.getcwd()))
import search
from parse import build_url, validate_url_format

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG)

@app.route("/", methods=['GET', 'POST'])
def render():
	crawl_history = request.cookies.get('crawl_history')
	if not crawl_history:
		crawl_history = ""
	crawl_ids = crawl_history.split(", ")

	container1_data = list()

	if crawl_ids[0] == "":
		container1_data = None
	else:
		crawl_ids = crawl_ids[::-1]
		for crawl_id in crawl_ids:
			if crawl_id:
				r = requests.get("https://lacerta-2021.uc.r.appspot.com/crawls/" + crawl_id)
				container1_data.append({"id": crawl_id, "url": r.json()["url"]})
	return render_template('layout.html', container1_data=container1_data)


@app.route("/query", methods=['GET', 'POST'])
def query():
	if request.method == 'GET':
		return redirect(url_for('render'))
	else:
		logging.info(request.form)
		start = request.form["start_url"]
		depth = request.form["depth"]
		keyword = request.form["keyword"]
		search_type = request.form["search_type"]

		start_url = build_url(start)

		if not validate_url_format(start_url):
			return bad_request('Error: Invalid Start URL: {}. Search only supports http(s)'.format(start_url))
		if not start or not depth:
			return bad_request('Error: Start URL and seach depth required!')
		if search_type not in ['BFS', 'DFS']:
			return bad_request('Error: search type {} is an invalid search type'.format(search_type))
		try:
			int(depth)
		except ValueError as error:
			tb = traceback.format_exc()
			logging.error(tb)
			return bad_request('Error: Invalid depth. Please specify a positive integer')

		if int(depth) < 0:
			return bad_request('Error: Invalid depth. Please specify a positive integer')

		if keyword:
			if len(keyword.split()) > 1:
				return bad_request('Error: keyword must be one word')
			if not keyword.isalpha():
				return bad_request('Error: keyword must only contain letters a-z')

		try:
			result = search.search(start_url, depth, keyword, search_type)
			result_json = search.loadGraph(result)
			result_json_d3 = search.transformGraph(result_json)

			# store crawl data
			data = {'url': start_url, 'type': search_type, 'depth': depth, 'keyword': keyword}
			r = requests.post("https://lacerta-2021.uc.r.appspot.com/crawls", json=data)
			crawl_id = r.json()["id"]
			print(crawl_id)

			# build cookie
			crawl_history = request.cookies.get('crawl_history')
			if crawl_history:
				crawl_history = crawl_history + ", " + crawl_id
			else:
				crawl_history = crawl_id
			if sys.getsizeof(crawl_history) > 4093:
				crawl_history = crawl_history.split(', ', 1)[-1]

			# build response
			if not result.nodes:
				return bad_request('Oops! Empty Graph! Try another start URL')
			else:
				response = make_response(result_json_d3, 200)
				response.set_cookie('crawl_history', crawl_history)
				return response
		except ValueError as error:
			tb = traceback.format_exc()
			logging.error(tb)
			return bad_request(str(error))
		except Exception as e:
			tb = traceback.format_exc()
			logging.error(tb)
			return server_error(str(e))

@app.errorhandler(400)
def bad_request(error_message):
	message = {
		'status' : 400,
		'message' : str(error_message)
	}
	response = jsonify(message)
	response.status_code = 400
	return response

@app.errorhandler(500)
def server_error(error_message):
	message = {
		'status' : 500,
		'message' : str(error_message)
	}
	response = jsonify(message)
	response.status_code = 500
	return response

if __name__ == '__main__':
	app.run()
