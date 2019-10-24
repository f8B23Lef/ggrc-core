# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Method that help us compare json values"""

from datetime import datetime
from datetime import date


def lists_equal(list1, list2):
  """Compare two lists and return a result: True if lists do not have
  updated values."""
  if len(list1) != len(list2):
    return False
  if not list1:
    return True
  if isinstance(list1[0], dict):
    # we need it to have sorted values that we able to compare
    dict1 = {item.get('id'): item for item in list1}
    dict2 = {item.get('id'): item for item in list2}
    return dicts_equal(dict1, dict2)
  return sorted(list1) == sorted(list2)


def dicts_equal(dict1, dict2):
  """Compare two dictionaries and return a result: True if dictionaries do
  not have different key-value pair. Comparison does not count new key-value
  pairs that does not contain one of dictionaries."""
  if len(dict1.keys()) > len(dict2.keys()):
    dict1, dict2 = dict2, dict1
  for field, value in dict1.items():
    if str(field).startswith("_"):
      # Debug information does not related to model
      continue
    if field in dict2:
      if not fields_equal(dict2[field], value):
        return False
  return True


def fields_equal(obj_field, src_field):
  """Compare tho objects and their content. If an object is a type of
   List of Dict, then each item of it will be compared. Returns True if
   objects are equal to each other."""
  if isinstance(obj_field, dict):
    return dicts_equal(obj_field, src_field)
  elif isinstance(obj_field, list):
    return lists_equal(obj_field, src_field)

  obj_field = convert_to_string(obj_field)
  src_field = convert_to_string(src_field)

  return obj_field == src_field


def convert_to_string(custom_value):
  """Convert custom types to string to simplify comparison"""
  if isinstance(custom_value, datetime):
    return custom_value.strftime("%Y-%m-%dT%H:%M:%S")
  if isinstance(custom_value, date):
    return custom_value.strftime("%Y-%m-%d")
  return custom_value
