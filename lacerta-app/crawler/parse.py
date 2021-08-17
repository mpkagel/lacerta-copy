#!/usr/bin/python3.8

import logging
from lxml import etree, html
from lxml.html.clean import Cleaner
from random import shuffle
import requests
from urllib.parse import urldefrag, urlparse, urlsplit, urljoin, urlunsplit

class Web:
    """ Web object stores parses a webpage and stores relevant webpage contents.
        Web object requires web urls are in a specific format. Webpages that
        are not navigable are swallowed, i.e. an error is logged, but an exception
        is not thrown.

        attributes:
        url = webpage url and must contain scheme and netloc
        response = webpage response
        status_code =  response status code
        urls = urls parsed from html
        html = stores html object containing webpage's html
        title = stores webpage's title
        text = stores renderable webpage text
    """
    def __init__(self, url):
        logging.info(url)
        self.url = self.normalize(build_url(url))
        self.response = self.get_response(self.url)
        self.status_code = self.get_status()
        #urls stored in set to remove duplicates
        self.urls = set()
        self.html = self.get_html()
        self.get_urls_from_html()
        self.title = self.get_title_from_html()
        self.text = self.get_text()

    def normalize(self, url):
        """
            normalizes url by removing unnecessary or redundant separators
            and also removes url fragments
        """
        result = urlunsplit(urlsplit(url))
        return urldefrag(result)[0]

    def is_absolute(self, url):
        """
            determines if a url is absolute. returns true if the url contains
            the netloc (i.e. https://www...) or false if it doesn't
        """
        return bool(urlparse(url).netloc)

    def absolute_url(self, url):
        """
            this function creates an absolute url by joining a relative url
            to the webpage's url

            keyword arguments:
            url = relative url
        """
        return urljoin(self.url, url)

    def get_html(self):
        """
            parses the html from the webpages with valid responses, or it returns
            a None object otherwise. NOTE: html utilizes response.content which does
            not handle encoding. Encoding was forgone in order to optimize for speed.
        """
        if self.status_code == 200 and self.response.content:
            try:
                return html.fromstring(self.response.content)
            except Exception as e:
                logging.error(e)
        return None

    def get_urls_from_html(self):
        """
            parses all urls contained in the html. urls are stored in a set which
            eliminates redundant urls. Additionally, the set of urls is shuffled,
            i.e. randomized.
        """
        if self.html is None:
            logging.error('HTML not available cannot get URLs')
            return None
        else:
            raw_urls = self.html.xpath('//a/@href')
            logging.debug(raw_urls)
            return shuffle([self.urls.add(self.absolute_url(self.normalize(url))) for url in raw_urls])

    def get_title_from_html(self):
        """
            Pulls the Title from the webpage's html. NOTE: the HTML was not cleaned before pulling the
            Title. This was done because cleaning the HTML removed the Title tags.
        """
        if self.html is None:
            logging.error('Cannot find title. HTML not available.')
            return None
        return self.html.findtext('.//title')

    #Note: get_text doesn't address broken html, i.e. although style/js removed from html,
    # it will still return .css/js when there are missing tags in the html. lxml.html.fromstring
    # is supposed to fix the broken html, but it doesn't catch everything
    #
    # https://lxml.de/tutorial.html#elements-contain-text
    def get_text(self):
        """
            returns all renderable text from valid webpage HTML. the html is
            cleaned prior to scraping in order to remove unnecessary information,
            however, cleaning does not completely fix all broken html. The result
            is sometimes get_text will pull style or javascript info.
        """
        if self.html is None:
            logging.error('Invalid response. HTML not available.')
            return None
        cleaned = self.clean_html()
        if cleaned is None:
            logging.error('Error cleaning HTML. Invalid object returned.')
            return None
        return cleaned.text_content().lower()


    def clean_html(self):
        """
            Cleaner removes HTML tags prior to processing. Note: cleaning removes
            the Title tags from HTML. Do not clean before grabbing titles!
        """
        if len(self.response.content):
            cleaner = Cleaner()
            cleaner.javascript = True
            cleaner.scripts = True
            cleaner.style = True
            cleaner.comments = True

            try:
                return html.fromstring(cleaner.clean_html(self.response.content))
            except Exception as e:
                logging.error(e)

            return None


    #source: http://docs.python-requests.org/en/master/user/quickstart/
    def get_response(self, url):
        """
            returns the response or throws an error
        """
        try:
            response = requests.get(url, timeout=3.0, allow_redirects=True)
            if response.status_code != 200:
                logging.error('Reponse Code: {}'.format(response.status_code))
            return response
        except requests.exceptions.HTTPError as httpErr:
            logging.error('HTTP Error: {}'.format(httpErr))
        except Exception as e:
            logging.error('Server Error: {}'.format(e))
        return None


    def get_status(self):
        """
            return status code
        """
        if self.response:
            return self.response.status_code
        return 500


def build_url(url):
    components = urlparse(url)
    if not components.scheme:
        return ''.join(('https://',url))
    return url

def validate_url_format(url):
    components = urlparse(url)
    if components.scheme and components.netloc:
        if components.scheme == 'https' or components.scheme == 'http':
            return True
    else:
        return False
