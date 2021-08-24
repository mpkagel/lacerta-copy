#!/usr/bin/python3.8

from flask import jsonify
import json
import logging
from parse import Web, validate_url_format
import random
import requests
import timeit

MAX_NODES=50
MAX_TIME=5


class Node:
    """Node class used to store visited webpage attributes
        url = url for webpage
        edges =  all the urls contained on the webpage
        title = title of web page
        has_keyword = set to true if keyword contained within text of webpage"""
    def __init__(self, web):
        self.url = web.url
        self.edges = []
        self.title = web.title
        self.has_keyword = False

    def get_random_neighbor(self, neighbors):
        if neighbors:
            self.edges.append(random.choice(list(neighbors)))

    def get_all_neighbors(self, neighbors):
        self.edges.extend(list(neighbors))

    def check_for_keyword(self, text, keyword):
        """stop keyword feature"""
        if text and keyword:
            if keyword in text:
                self.has_keyword = True
                logging.debug('keyword: {} found!'.format(keyword))

    def __str__(self):
        if self is None:
            return
        node_str = 'url: {}, title: {}, has_keyword: {}, edges:'.format(self.url, self.title, self.has_keyword)
        edges_str = ','.join(self.edges)
        return '{} {}'.format(node_str, edges_str)


class Graph:
    """ graph = {
        'start_url' : start,
        'search_type' : 'bfs',
        'depth' : depth,
        'keyword' : keyword,
        'nodes' : {
            'url1': {
                'url' : 'url1',
                'title' : 'TITLE',
                'has_keyword' : False ,
                'edges' : ['url2','url3']
            }
        }
    }"""
    def __init__(self, start, depth, keyword, search_type):
        self.start_url = start
        self.depth = depth
        self.keyword = keyword
        self.search_type = search_type
        self.nodes = dict()

    def add_node(self, node):
        self.nodes[node.url]=node


def search(start_url, max_depth, keyword, search_type):
    """search validates form data, and then calls appropriate search function"""

    #NOTE: API Gateway times out in 30 seconds. timer used to ensure function returns
    # prior to API Gateway time-out. Also note, that this is less than ideal and does
    # not always work (in the case of encoding, urllib will try every single encoding Type
    # which will over extend the timer). For future, use fan-out method, and enable a database
    start_time = timeit.default_timer()

    if not validate_url_format(start_url):
        raise ValueError('Invalid Start URL: {}'.format(start_url))

    if not int(max_depth) or int(max_depth) < 0:
        raise ValueError('Error: max_depth must be a positive integer.')

    keyword_lower = keyword.lower()

    g = Graph(start_url, max_depth, keyword_lower, search_type)

    if search_type == 'BFS':
        if int(max_depth) > 3:
            raise ValueError('Error: Invalid depth. max_depth for BFS is 3, or less')
        toVisit = []
        toVisit.append(g.start_url)
        return bfs(g, toVisit, keyword_lower, 0, int(max_depth), start_time)
    elif search_type == 'DFS':
        if int(max_depth) > 20:
            raise ValueError('Error: Invalid depth. max_depth for DFS must be 20 or less.')
        return dfs(g, keyword_lower, int(max_depth), start_time, start_url)
    else:
        raise ValueError('Invalid Search Type: Specify BFS or DFS')


def bfs(graph, toVisit, keyword, current_depth, max_depth, start_time):
    """ recursive implementation of breadth first search. each recursive call
        builds the next level (i.e. sublevel) of the graph. bfs crawls the web
        from user specified start_url (which is stored in the graph object), and
        builds a graph from visited web pages. The algorithm pulls all the
        urls contained in a webpage's html, and then visits each link.
        Links/neighbors are limited to XX nodes for clarity.

        keyword arguments:
        graph -- graph object containing visited nodes
        toVisit -- list of neighboring nodes not yet visited (as urls)
        keyword -- stop keyword stops search if found on rendered web text
        current_depth -- current level of graph being built
        max_depth -- the maximum depth of the graph
    """

    logging.debug('current depth = {}'.format(current_depth))
    if current_depth > max_depth:
        logging.debug('reached max depth. returning')
        return graph
    if not toVisit:
        logging.debug('toVisit empty. returning')
        return graph
    next_level = []
    for url in toVisit:
        web = Web(url)
        if web and web.status_code == 200:
            node = Node(web)
            node.check_for_keyword(web.text, keyword)
            if current_depth is not max_depth:
                node.get_all_neighbors(web.urls)
            graph.add_node(node)
            logging.debug('nodes = {}'.format(len(graph.nodes)))
            if node.has_keyword:
                logging.debug("stopping due to keyword")
                return graph
            if len(graph.nodes) >= MAX_NODES:
                logging.debug('Maximum number of nodes reached')
                return graph
            if processing_time_exceeded(start_time):
                return graph
            for neighbor in node.edges:
                if neighbor not in graph.nodes:
                    next_level.append(neighbor)
    return bfs(graph, next_level, keyword, current_depth+1, max_depth, start_time)


def dfs(graph, keyword, depth, start_time, current_url):
    """ recursive implementation of depth first search which crawls the web,
        and creates a graph of visited web pages. the search starts from a
        user specified start_url which is stored in the graph object. the
        algorithm selects one random link from the page and then navigates to
        the next node.

        keyword arguments:
        graph -- graph object storing visited nodes
        keyword -- stop keyword stops search if found on rendered web text
        depth -- user specified graph depth
    """
    if processing_time_exceeded(start_time):
        return graph
    if len(graph.nodes)-1 >= depth:
        logging.debug('max depth reached')
        return graph
    web = Web(current_url)
    if web and web.status_code == 200:
        node = Node(web)
        node.get_random_neighbor(web.urls)
        node.check_for_keyword(web.text, keyword)
        graph.add_node(node)
        if node.has_keyword:
            logging.debug("stopping due to keyword")
            return graph
        for edge in node.edges:
            if edge not in graph.nodes:
                return dfs(graph, keyword, depth, start_time, edge)
    return graph


def processing_time_exceeded(start_time):
    if timeit.default_timer() - start_time >= MAX_TIME:
        logging.error('Maximum processing time reached')
        return True
    return False


def loadNode(n):
    """loads node object to json format"""
    result = {
        'url': n.url,
        'title': n.title,
        'has_keyword': n.has_keyword,
        'edges': list(n.edges)
    }
    return result


def loadGraph(g):
    """loads graph object to json format"""
    result = {
        'start_url' : g.start_url,
        'search_type' : g.search_type,
        'depth' : g.depth,
        'keyword' : g.keyword,
        'nodes' : dict()
    }
    for k,v in g.nodes.items():
        result['nodes'][k] = loadNode(v)
    return result


def transformGraph(graph):
    """converts search graph format to d3 accepted data format"""
    result = {
        'start_url': graph['start_url'],
        'keyword': graph['keyword'],
        'depth': graph['depth'],
        'type': graph['search_type'],
        'links': list(),
        'nodes': list()
    }

    for url in graph['nodes'].items():
        node = {
            'id':url[0],
            'title': url[1]['title'],
            'has_keyword': url[1]['has_keyword']
        }
        result['nodes'].append(node)
        for edge in url[1]['edges']:
            if edge in graph['nodes']:
                link = {'source': url[0], 'target': edge}
                result['links'].append(link)

    return json.dumps(result, indent=True)
