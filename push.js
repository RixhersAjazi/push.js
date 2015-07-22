/**
 * push.js
 * --------
 * A compact, cross-browser solution for Javascript desktop notifications
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Tyler Nickerson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Inspired by the work of
 * Tsvetan Tsvetkov (ttsvetko) and Alex Gibson (alexgibson)
 */

// Window root
var root = (window !== 'undefined' ? window : self);

(function (global, factory) {

    'use strict';

    /* Use AMD */
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return factory(global, global.document);
        });
    }
    /* Use CommonJS */
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(global, global.document);
    }
    /* Use Browser */
    else {
        global.Push = new (factory(global, global.document))();
    }

})(root, function (w, d) {

    var Push = function () {

        var
        self = this,
        isUndefined   = function (obj) { return obj === undefined; },
        isString   = function (obj) { return obj && obj.constructor === String; },
        isFunction = function (obj) { return obj && obj.constructor === Function; },

        /**
         * Callback function for the 'create' method
         * @return {void}
         */
        create_callback = function (title, options) {

            /* Safari 6+, Chrome 23+ */
            if (w.Notification) {

                notification =  new w.Notification(
                    title,
                    {
                        icon: (isString(options.icon) || isUndefined(options.icon)) ? options.icon : options.icon.x32,
                        body: options.body,
                        tag: options.tag,
                    }
                );

            /* Legacy webkit browsers */
            } else if (w.webkitNotifications) {

                notification = win.webkitNotifications.createNotification(
                    options.icon,
                    title,
                    options.body
                );

                notification.show();

            /* Firefox Mobile */
            } else if (navigator.mozNotification) {

                notification = navigator.mozNotification.createNotification(
                    title,
                    options.body,
                    options.icon
                );

                notification.show();

            /* IE9+ */
            } else if (win.external && win.external.msIsSiteMode()) {

                //Clear any previous notifications
                w.external.msSiteModeClearIconOverlay();
                w.external.msSiteModeSetIconOverlay(((isString(options.icon) || isUndefined(options.icon)) ? options.icon : options.icon.x16), title);
                w.external.msSiteModeActivate();

                notification = {};
            }

            /* Wrapper used to close notification later on */
            wrapper = {

                close: function () {

                    /* Safari 6+, Chrome 23+ */
                    if (notification.close) {
                        notification.close();

                    /* Legacy webkit browsers */
                    } else if (notification.cancel) {
                        notification.cancel();

                    /* IE9+ */
                    } else if (w.external && win.external.msIsSiteMode) {
                        w.external.msSiteModeClearIconOverlay();
                    }

                }

            };

            /* Autoclose timeout */
            if (notification &&
                notification.addEventListener &&
                options.timeout) {

                notification.addEventListener('show', function () {

                    setTimeout(function () {
                        wrapper.close();
                    }, options.timeout);

                });

            }

            /* Notification callbacks */
            if (isFunction(options.onShow))
                notification.addEventListener('show', options.onShow);

            if (isFunction(options.onError))
                notification.addEventListener('error', options.onError);

            if (isFunction(options.onClick))
                notification.addEventListener('click', options.onClick);

            if (isFunction(options.onClose)) {
                notification.addEventListener('close', options.onClose);
                notification.addEventListener('cancel', options.onClose);
            }
        },

        /**
         * Permission types
         * @enum {String}
         */
        Permission = {
            DEFAULT: 'default',
            GRANTED: 'granted',
            DENIED: 'denied'
        },

        Permissions = [Permission.GRANTED, Permission.DEFAULT, Permission.DENIED];

        /* Allow enums to be accessible from Push object */
        self.Permission = Permission;

        /*****************
            Permissions
        /*****************/

        /**
         * Requests permission for desktop notifications
         * @param {Function} callback - Function to execute once permission is granted
         * @return {void}
         */
        self.Permission.request = function (callback) {

            /* Return if Push not supported */
            if (!self.isSupported) { return; }

            /* Set an empty callback if an invalid one is specified */
            callback = isFunction(callback) ? callback : function () {};

            /* Legacy webkit browsers */
            if (w.webkitNotifications && w.webkitNotifications.checkPermission) {
                w.webkitNotifications.requestPermission(callback);

            /* Safari 6+, Chrome 23+ */
            } else if (w.Notification && w.Notification.requestPermission) {
                w.Notification.requestPermission(callback);
            }

        };

        /**
         * Gets the permission level
         * @return {Permission} The permission level
         */
        self.Permission.get = function () {

            var permission;

            /* Return if Push not supported */
            if (!self.isSupported) { return; }

            /* Safari 6+, Chrome 23+ */
            if (w.Notification && w.Notification.permissionLevel) {
                permission = w.Notification.permissionLevel;

            /* Legacy webkit browsers */
            } else if (w.webkitNotifications && w.webkitNotifications.checkPermission) {
                permission = Permissions[w.webkitNotifications.checkPermission()];

            /* Firefox 23+ */
            } else if (w.Notification && w.Notification.permission) {
                permission = w.Notification.permission;

            /* Firefox Mobile */
            } else if (navigator.mozNotification) {
                permission = Permissions.GRANTED;

            /* IE9+ */
            } else if (w.external && w.external.msIsSiteMode() !== undefined) {
                permission = w.external.msIsSiteMode() ? Permission.GRANTED : Permission.DEFAULT;
            }

            return permission;

        };

        /*********************
            Other Functions
        /*********************/

        /**
         * Detects whether the user's browser supports notifications
         * @return {Boolean}
         */
        self.isSupported = (function () {

             var isSupported = false;

             try {

                 isSupported =

                     /* Safari, Chrome */
                     !!(w.Notification ||

                     /* Chrome & ff-html5notifications plugin */
                     w.webkitNotifications ||

                     /* Firefox Mobile */
                     navigator.mozNotification ||

                     /* IE9+ */
                     (w.external && w.external.msIsSiteMode() !== undefined));

             } catch (e) {}

             return isSupported;

         })();

         /**
          * Creates and displays a new notification
          * @param {Array} options
          * @return {void}
          */
        self.create = function (title, options) {

            var notification,
                wrapper;

            /* Fail if the browser is not supported */
            if (!self.isSupported) {
                console.error('push.js is incompatible with self browser.');
                return;
            }

            /* Request permission if it isn't granted */
            if (self.Permission.get() !== self.Permission.GRANTED) {
                self.Permission.request(function () {
                    create_callback(title, options);
                });
            }

        };
    };

    return Push;

});