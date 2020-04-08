# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Models for bulk update modals."""
import re

from lib import base, decorator, browsers
from lib.constants import objects, value_aliases
from lib.element import page_elements


class BaseBulkUpdateModal(base.Modal):
  """Common class for Bulk Complete and Bulk Verify modals."""
  # pylint: disable=too-few-public-methods

  def __init__(self):
    super(BaseBulkUpdateModal, self).__init__()
    self._root = self._browser.div(class_name="modal")
    self.filter_section = FilterSection(self._root)

  @property
  def is_displayed(self):
    """Returns whether modal is opened or not."""
    return self._root.exists


class BulkVerifyModal(BaseBulkUpdateModal):
  """Represents bulk verify modal."""

  def __init__(self):
    super(BulkVerifyModal, self).__init__()
    self._root = self._root.element(tag_name="assessments-bulk-verify")
    self.select_assessments_section = SelectAssessmentsToVerifySection(
        self._root)

  @property
  def cancel_button(self):
    """Returns 'Cancel' button."""
    return self._root.button(text='Cancel')

  @property
  def verify_button(self):
    """Returns whether 'Verify' button."""
    return self._root.button(text='Verify')

  @property
  def is_verify_button_active(self):
    """Returns whether 'Verify' button is enabled and can be clicked."""
    return self.verify_button.wait_until(lambda x: x.exists).enabled

  def click_verify(self):
    """Clicks 'Verify' button."""
    self.verify_button.click()

  def click_cancel(self):
    """Clicks 'Cancel' button."""
    self.cancel_button.click()


class FilterSection(page_elements.CollapsiblePanel):
  """Represents collapsible filter section."""

  def __init__(self, parent_element):
    super(FilterSection, self).__init__(parent_element)
    self._root = parent_element.element(
        tag_name="collapsible-panel", text=re.compile("FILTER"))

  def is_state_filter_disabled(self):
    """Returns whether state filter disabled."""
    return "disabled" in self._root.element(
        class_name="multiselect-dropdown__input-container").get_attribute(
        "class")

  def get_state_filter_options(self):
    """Returns options list from state filter."""
    self._root.element(
        class_name="multiselect-dropdown__input-container").click()
    return [i.text for i in self._root.element(
        class_name="multiselect-dropdown__list").labels()]

  def click_add_attribute_btn(self):
    """Clicks 'Add Attribute' button.'"""
    self._root.button(text="Add Attribute").click()

  def _set_filter(self, container, attr_name, value, operator, compare_op):
    """Set filter fields according to passed parameters."""
    # pylint: disable=too-many-arguments
    operator_element = container.parent().elements(
        class_name="filter-operator")[-1].select()
    if operator and operator_element.exists:
      operator_element.select(operator)
    dropdown = container.element(class_name="autocomplete-dropdown")
    dropdown.input().click()
    dropdown.element(value=attr_name).click()
    container.selects()[-1].select(compare_op)
    container.inputs()[-1].send_keys(value)

  def get_filters_dicts(self):
    """Returns settings of the filter in a list of dicts format:
    [{"attr_name": ..., "compare_op": ..., "value": ...}]."""
    filters_list = []
    for i in self._root.elements(class_name="filter-container__attribute"):
      filters_list.append({"attr_name": i.element(
          class_name="autocomplete-dropdown").input().value,
          "compare_op": i.selects()[-1].text,
          "value": i.inputs()[-1].value})
    return filters_list

  def add_attribute_filter(self, attr_name, value, operator=None,
                           compare_op=value_aliases.EQUAL_OP):
    """Add attribute filter according to passed parameters."""
    self.click_add_attribute_btn()
    self._set_filter(
        self._root.elements(class_name="filter-container__attribute")[-1],
        attr_name, value, operator, compare_op)

  def add_mapping_filter(self, obj_type, attr_name, value, operator=None,
                         compare_op=value_aliases.EQUAL_OP):
    """Add mapping filter attribute according to passed parameters."""
    # pylint: disable=too-many-arguments
    self._root.button(text="Add Mapping Filter").click()
    container = self._root.elements(
        class_name="mapping-container__criteria")[-1]
    container.select().select(obj_type)
    self._set_filter(container, attr_name, value, operator, compare_op)

  def apply(self):
    """Clicks Apply button to apply filtering according to settings."""
    self._root.button(text="Apply").click()

  @property
  def reset_to_default_button(self):
    return self._root.button(text="Reset to Defaults")

  def get_mapped_to_audit_filter(self):
    """Get title of audit from 'MAPPED TO AUDIT' default filter of
    'Filter by Mapping' section."""
    return self._root.div(
        class_name="advanced-search__parent-filter").span().text


class SelectAssessmentsToVerifySection(page_elements.CollapsiblePanel):
  """Represents 'Select assessments' section."""

  def __init__(self, parent_element):
    super(SelectAssessmentsToVerifySection, self).__init__(parent_element)
    self._root = parent_element.element(
        tag_name="collapsible-panel", text=re.compile("SELECT ASSESSMENTS"))

  @property
  def tree_view(self):
    return BulkUpdateTreeView(obj_name=objects.ASSESSMENTS)

  def get_tree_view_item_by_title(self, title):
    """Gets assessment tree view item from tree view by its title."""
    return AssessmentTreeViewItem(
        self._root.element(tag_name="tree-item-attr", text=title).parent(
            tag_name="mapper-results-item"))

  @property
  def pagination(self):
    return base.Pagination(self._root)

  def click_select_all(self):
    """Clicks 'Select All' button to select all assessments."""
    self._root.button(text="All").click()

  @decorator.execute_on_all_pagination_pages
  def _extend_scopes(self, scopes, with_second_tier_info):
    """Extends scopes with scopes from current page of tree view."""
    scopes_from_page = self.tree_view.get_list_members_as_list_scopes()
    if with_second_tier_info:
      for scope in scopes_from_page:
        scope.update(self.get_tree_view_item_by_title(
            title=scope["TITLE"]).assessment_info)
    scopes.extend(scopes_from_page)

  def get_objs_scopes(self, with_second_tier_info=False):
    """Get list of scopes (dicts) of assessments which are displayed on
    Tree View on all pages according to current set of visible fields.

    Returns:
      list of scopes.
    """
    self.tree_view.open_set_visible_fields().select_and_set_visible_fields()
    scopes = []
    self._extend_scopes(scopes, with_second_tier_info)
    return scopes


class BulkUpdateTreeView(base.UnifiedMapperTreeView):
  """Tree-View class for Bulk Update modal."""

  def __init__(self, driver=None, obj_name=None):
    super(BulkUpdateTreeView, self).__init__(driver, obj_name)

  def _init_tree_view_items(self):
    """Init Tree View items as list of AssessmentTreeViewItem from current
    widget.

    Returns:
      list of AssessmentTreeViewItem entities or empty list if no items found
      in tree view.
    """
    self._tree_view_items = (
        [] if self._browser.div(class_name="well well-small").exists else [
            AssessmentTreeViewItem(element)
            for element in self._browser.elements(
                tag_name="mapper-results-item")])
    return self._tree_view_items


class AssessmentTreeViewItem(base.TreeViewItem):
  """Class represents Assessment item from Select Assessments section of
  Bulk update modal."""
  # pylint: disable=invalid-name

  def __init__(self, parent_element):
    super(AssessmentTreeViewItem, self).__init__(
        browsers.get_driver(), parent_element.wd)
    self._root = parent_element
    self.mapped_control_section = self._root.element(
        tag_name="collapsible-panel", text="Mapped Controls")
    self.evidence_urls_section = self._root.element(
        tag_name="collapsible-panel", text="Evidence and Custom Attributes")
    self.comments_section = self._root.element(
        tag_name="collapsible-panel", text=re.compile("Comments"))

  @property
  def is_mapped_controls_section_editable(self):
    """Returns whether mapped controls section editable through checking
    existence of mapping icon.
    """
    return self.mapped_control_section.element(
        class_name="fa-code-fork").exists

  @property
  def is_evidence_section_editable(self):
    """Returns whether Evidence and custom attributes section editable
    through checking existence of edit/delete icons and attach/add buttons.
    """
    return (
        self.evidence_urls_section.element(class_name="fa-trash").exists or
        self.evidence_urls_section.element(
            class_name=re.compile("fa-pencil")).exists or
        self.evidence_urls_section.button(text="Add").exists or
        self.evidence_urls_section.button(text="Attach").exists)

  @property
  def is_comments_section_editable(self):
    """Returns whether Comments section editable through checking existence
    of comment input element.
    """
    return (base.CommentInput(self.comments_section).exists or
            self.comments_section.button(text="Add").exists)

  def expand(self):
    """Expands assessment item."""
    if "expanded" not in self._root.div().classes:
      self._root.div(class_name="item-wrapper").click()

  def open(self):
    """Opens assessment detail page."""
    self._root.link(text="Open").click()

  def _get_mapped_controls_titles(self):
    """Expands 'Mapped Controls' subsection and returns mapped controls
    snapshots titles list."""
    page_elements.CollapsiblePanel(self.mapped_control_section).expand()
    # wait until mapped control or empty message element appeared
    self._root.wait_until(lambda x: any(
        [x.element(class_name="mapped-snapshot-item").present,
         x.element(class_name="object-list__item-empty").present]))
    return [i.element(class_name="title").text for i in self._root.elements(
        class_name="mapped-snapshot-item")]

  def _get_evidence_urls(self):
    """Expands 'Evidence and Custom Attributes' subsection and returns list of
    evidence urls.

    Returns:
      list of urls.
    """
    page_elements.CollapsiblePanel(self.evidence_urls_section).expand()
    return [i.text for i in self._root.element(
        class_name="evidence-objects__wrapper-item",
        text=re.compile("EVIDENCE URL")).links()]

  def _get_comments(self):
    """Expands comments subsection and returns comments items from it.

    Returns:
      comment in dictionary format.
    """
    page_elements.CollapsiblePanel(self.comments_section).expand()
    # wait until comments or empty message element appeared
    self.comments_section.wait_until(
        lambda x: any([x.element(tag_name="mapped-comments").present,
                       x.span(class_name="empty-message").present]))
    return [base.CommentItem(i).scope for i in self.comments_section.elements(
        class_name="comment-object-item")]

  @property
  def assessment_info(self):
    """Expands second tier of assessment item.

    Returns:
      dict with keys 'comments', 'evidence_urls' and 'mapped_objects'."""
    self.expand()
    return {"mapped_objects": self._get_mapped_controls_titles(),
            "evidence_urls": self._get_evidence_urls(),
            "comments": self._get_comments()}
