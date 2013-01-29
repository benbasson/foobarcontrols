/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Foobar Controls.
 *
 * The Initial Developer of the Original Code is
 *   Ben Basson <ben@basson.at>
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Ben Basson <ben@basson.at>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var foobar = 
{
  init: function ()
  {
    const nsILocalFile = Components.interfaces.nsILocalFile;
    
    foobar.file = Components.classes['@mozilla.org/file/local;1']
                     .createInstance(nsILocalFile);
    foobar.prefs =   Components.classes["@mozilla.org/preferences-service;1"]
                     .getService(Components.interfaces.nsIPrefService)
                     .getBranch("foobar.");
    
    var lHasUserValue = foobar.prefs.prefHasUserValue("location");
    
    // User has already specified a location, try it
    if (lHasUserValue) {
      foobar.file.initWithPath(foobar.prefs.getCharPref("location"));
    }
    
    // Attempt to go to the registry
    else if (!lHasUserValue || !foobar.file.exists()) {  
    
      const nsIWindowsRegKey = Components.interfaces.nsIWindowsRegKey;
      var lInstallDir = null;
      
      // Open HKEY_LOCAL_MACHINE\SOFTWARE
      var lHKLMSoftware = Components.classes["@mozilla.org/windows-registry-key;1"].createInstance(nsIWindowsRegKey);
      lHKLMSoftware.open(nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE, "SOFTWARE", nsIWindowsRegKey.ACCESS_READ);
      
      // If foobar2000 exists
      if (lHKLMSoftware.hasChild("foobar2000")) {
        var lFoobarKey = lHKLMSoftware.openChild("foobar2000", nsIWindowsRegKey.ACCESS_READ);
        if (lFoobarKey.hasValue("InstallDir")) {
          lInstallDir = lFoobarKey.readStringValue("InstallDir");
        }
      }
      
      // Tidy up
      lHKLMSoftware.close();
      
      if (lInstallDir != null) {
        // Try the registry path (case insensitive as per user feedback)
        foobar.file.initWithPath(lInstallDir + "\\Foobar2000.exe");
        if (!foobar.file.exists()) {
          foobar.file.initWithPath(lInstallDir + "\\foobar2000.exe");
        }
      }
    }
    
    // Attempt probable location in Program Files
    if (!foobar.file.target || !foobar.file.exists()) {
      foobar.file.initWithPath("C:\\Program Files\\Foobar2000\\Foobar2000.exe");
    }
    
    // Finally try lower-case entry in Program Files
    if (!foobar.file.exists()) {
      foobar.file.initWithPath("C:\\Program Files\\foobar2000\\foobar2000.exe");
    }

    if (foobar.file.exists()) {
      foobar.initialised = true;
      
      // If we get here, no pref is set, but foobar exists, we should store the path for later
      if (!foobar.prefs.prefHasUserValue("location")) {
        foobar.prefs.setComplexValue("location", nsILocalFile, foobar.file);
      }
    }
  }
  
, initProcess: function () 
  {   
    // Only initialise once
    if (foobar.initialised) {
      return true;
    }
    
    // No Foobar found there, so ask user for input 
    if (!foobar.file.exists()) {
      alert("Foobar2000 could not be found.\nPlease manually locate Foobar2000.exe");
      if (foobar.findfoobar()) {
        foobar.file.initWithPath(foobar.path);
        foobar.initialised = true;
      }
    }
    // Otherwise bootup with known path
    else {
      foobar.file.initWithPath(foobar.path);
      foobar.initialised = true;
    }
    
    return foobar.initialised;
  }
  
, findfoobar: function() 
  {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    const nsILocalFile = Components.interfaces.nsILocalFile;
    
    var fp = Components.classes["@mozilla.org/filepicker;1"]
             .createInstance(nsIFilePicker);
  
    fp.init(window, "Locate Foobar2000.exe...", nsIFilePicker.modeOpen);
    fp.appendFilter("Foobar2000","foobar2000.exe");
    
    try {
      var initialDir = "C:\\Program Files\\Foobar2000\\";
      if (initialDir) {
        fp.displayDirectory = initialDir;
      }
    }
    catch (ex) {
      // ignore exception: file picker will open at default location
    }
    
    fp.appendFilters(nsIFilePicker.filterAll);
    var ret = fp.show();
    var success = false;
  
    if (ret == nsIFilePicker.returnOK) {
      var localFile = fp.file.QueryInterface(nsILocalFile);
      if (localFile.isExecutable()) {
        foobar.prefs.setComplexValue("location", nsILocalFile, localFile);
        foobar.path = foobar.prefs.getCharPref("location");
        success = true;
      }
    }
    
    return success;
  }
  
, docommand: function (argument) 
  {
    // Set up if we need to
    if (foobar.initProcess()) {
      // Get a new process instance each time
      var arguments = ["/" + argument];
      var process = Components.classes['@mozilla.org/process/util;1']
                      .createInstance(Components.interfaces.nsIProcess);
      process.init(foobar.file);
      process.run(false, arguments, 1);
      
      return false;
    }
  }
  
}

window.addEventListener("load",foobar.init,false);