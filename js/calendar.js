(function() {
    var items = [];

    angular.module('jCal', [])

        /*
         * This controller is responsible for the logic behind the actual
         * calendar area, taking care of tasks like instantiating new Items,
         * new Overlaps, and assigning their properties. There should not be
         * any View-related rendering tasks here, since that is taken care of
         * in the markup.
         */

        .controller('CalCtrl', ['$scope', function($scope) {
            
            var controller = this,
                i = 0;

            this.items = items;
            this._overlaps = [];

            /* 
             * Utility function to grab id from an array of objects
             * @private
             * @param id {String} desired id
             * @param array {Array} array of objects that have an id prop
             * @return {Object} matching object
             */
            this._getObjectFromId = function(id, array) {
                var m = 0;
                for (m=0; m<array.length; m++) {
                    if (id === array[m].id) {
                        return array[m];
                    }
                }
            };
        
            /* 
             * Finds overlaps and returns an array of ids
             * @private
             * @param item {Object} takes Item object
             * @param overlapArray {Array} takes array of either Item or Overlap 
             * objects
             * @return {Array} List of ids the item overlaps with
             */

            this._overlapWith = function(item, overlapArray) {
                var lengthItem = item.end - item.start,
                    i = 0,
                    output = [];

                for (i=0; i<overlapArray.length; i++) {
                    var diffStarts = Math.abs(item.start - overlapArray[i].start),
                        diffEnds = Math.abs(item.end - overlapArray[i].end),
                        lengthCompare = overlapArray[i].end - overlapArray[i].start;

                    // If the combined absolute values of the differences
                    // between the start times and the end times of the two
                    // items we're comparing is less than the combined heights
                    // of the two items we're comparing, then we have verified
                    // an overlap

                    if ((diffStarts + diffEnds) <= (lengthItem + lengthCompare)) {
                        output.push(overlapArray[i].id);
                    }
                }

                return output;
            };

            /* 
             * Returns an object containing the start and end time of an 
             * overlap
             * @private
             * @param item1, item2 {Object} takes Item object
             * @return {Object} start and end time of the overlap
             */

            this._calculateOverlap = function(item1, item2) {
                var starts = [],
                    ends = [];
                starts.push(item1.start, item2.start);
                ends.push(item1.end, item2.end);

                // The start and end times of the overlap is determined by the
                // lowest start time and the highest end time of two verified
                // overlapping items

                var start = Math.max.apply(null, starts);
                var end = Math.min.apply(null, ends);

                return { start: start, end: end };

            };

            /* 
             * Determines width of item based on stored overlap information
             * such that any two items that collide in time should have the 
             * same width if this alg is applied to all items in calendar
             * @private
             * @param item {Object} takes Item object
             * @return {String} number to divide width by
             */

            this._findWidthDivider = function(item) {
                var i = 0,
                    j = 0,
                    overlapArray = this._overlaps,
                    overlapMemberIds = [],
                    memberLengthArray = [],
                    overlapMemberOverlapIds = [],
                    overlapObj = null,
                    itemObj = null;


                // The width of the element is the total canvas width divided 
                // by the maximum number of peers, defined by items that not 
                // only share my overlap, but items that share my peers' 
                // overlaps. This accounts for cases where a new item is 
                // added to the calendar that doesn't overlap with me, but
                // overlaps with an item I overlap with.

                // How many members in my overlaps?
                for (i=0; i<item.overlap.length; i++) {
                    overlapObj = this._getObjectFromId(item.overlap[i], this._overlaps);
                    memberLengthArray.push(overlapObj.members.length);
                    overlapMemberIds = overlapMemberIds.concat(overlapObj.members);
                }

                // How many members in my overlap members' overlaps?
                for (i=0; i<overlapMemberIds.length; i++) {
                    itemObj = this._getObjectFromId(overlapMemberIds[i], this.items);
                    for (j=0; j<itemObj.overlap.length; j++) {
                        overlapObj = this._getObjectFromId(itemObj.overlap[j], this._overlaps);
                        if (overlapObj) {
                            memberLengthArray.push(overlapObj.members.length);
                        }
                    }
                }

                var max = Math.max.apply(null, memberLengthArray);
                if (max < 0) {
                    return 0;
                } else {
                    return max;
                }

            };


            /* 
             * Item class defines properties of a new event (item)
             * @param start {String} Numeric string indicating start time as
             * difference from calendar start
             * @param end {String} Numeric string indicating end time as 
             * difference from calendar start
             */
            var Item = function(start, end, title, location) {
                Item.counter = (Item.counter || 0) + 1;
                this._init.apply(this, arguments);
            };

            Item.prototype._init = function(start, end, title, location) {
                this.start = start;
                this.end = end;
                this.overlap = [];
                this.id = Item.counter;
                this.widthDivider = 1;
                this.position = 1;
                this.positionLocked = false;
                this.title = title || 'Sample Item';
                this.location = location || 'Sample location';
            };

            /* 
             * Overlap class defines properties and methods of an overlap
             * between two Items
             * @param start {String} Numeric string indicating start time of
             * overlap as difference from calendar start
             * @param end {String} Numeric string indicating end time of
             * overlaps difference from calendar start
             */

            var Overlap = function(start, end) {
                Overlap.counter = (Overlap.counter || 0) + 1;
                this._init.apply(this, arguments);
            };

            Overlap.prototype._init = function(start, end) {
                this.start = start;
                this.end = end;
                this.members = [];
                this.id = Overlap.counter;
                this.memberPositions = {};
            };

            /* 
             * Adds an item as a member of this Overlap, updates overlap and
             * item properties
             * @param item {Object} Item instance
             */

            Overlap.prototype.addItem = function(item) {
                var i = 1,
                    overlapPosition = 0;

                // A position is locked if an Item has already been assigned a
                // position. If the item has not yet been locked, proceed with
                // assignment.
                if (!item.positionLocked) {

                    // Iterating through the memberPositions of this Overlap
                    // instance, find the lowest position that is vacant.
                    while (this.memberPositions[i]) {
                        i++;
                    }
    
                    item.position = i;
                    item.positionLocked = true;
                }
                
                // Make sure that this item doesn't already exist as a member
                // of this Overlap
                if (this.members.indexOf(item.id) === -1) {
                    this.members.push(item.id);
                }
                this.memberPositions[item.position] = item.id;
                item.overlap.push(this.id);
            };

            /* 
             * Given two items, create a new Overlap object; this contains the
             * only means of constructing new Overlap instance
             * @private
             * @param item1, item2 {Object} Item instance
             */

            this._createNewOverlap = function(item1, item2) {
                var overlapInfo = this._calculateOverlap(item1, item2),
                    i = 0,
                    overlaps = this._overlaps;
                
                // Check to see if this overlap already exists. If it does, 
                // just add these items to the overlap that exists. Otherwise,
                // create a new one and add these items to it.
                for (i=0; i<overlaps.length; i++) {
                    if ((overlaps[i].start === overlapInfo.start) && 
                            (overlaps[i].end === overlapInfo.end)) {
                        overlaps[i].addItem(item1);
                        overlaps[i].addItem(item2);
                        return;
                    }
                }

                var newOverlap = new Overlap(overlapInfo.start, overlapInfo.end);
                newOverlap.addItem(item2);
                newOverlap.addItem(item1);
                                    
                this._overlaps.push(newOverlap);
            };

            /* 
             * Constructs and adds an Item object to the items array and update
             * Overlaps and existing Item properties
             * @param item {Object} Basic object containing start and end props
             */

            this.addItem = function(item) {
                
                var overlappingItems = this._overlapWith(item, this.items),
                    overlappingOverlaps = this._overlapWith(item, this._overlaps),
                    i = 0,
                    j = 0,
                    newItem = new Item(item.start, item.end),
                    overlapObj = null,
                    itemObj = null;

                if (overlappingItems.length) {

                    var removeArray = [];

                    if (overlappingOverlaps.length) {

                        // We want to sort this in order of overlaps that have
                        // the most members first, to avoid items which are 
                        // members of many overlaps being locked into too low
                        // a position
                        
                        var sortedOverlaps = [];

                        var _compareFunction = function(a,b) {
                            if (a.members.length > b.members.length) {
                                return 1;
                            }

                            if (a.members.length < b.members.length) {
                                return -1;
                            }

                            return 0;
                        };

                        // Push the actual overlap objects from the
                        // overlappingOverlaps array of IDs into the sorting
                        // array
                        for (i=0; i<overlappingOverlaps.length; i++) {
                            overlapObj = this._getObjectFromId(overlappingOverlaps[i], this._overlaps);
                            sortedOverlaps.push(overlapObj);
                        }

                        // Sort the sorting array using the members key of each
                        // Overlap object
                        sortedOverlaps.sort(_compareFunction);
                        
                        // Clear out the overlappingOverlaps array
                        overlappingOverlaps.length = 0;

                        // Push just the IDs of the Overlap objects in the sorted
                        // array back into the overlapingOverlaps array
                        for (i=0; i<sortedOverlaps.length; i++) {
                            overlappingOverlaps.push(sortedOverlaps[i].id);
                        }

                        // Reverse so that we get the Overlap objects with the
                        // greatest number of members first
                        overlappingOverlaps.reverse();

                        // Update the Overlap objects with this new member
                        for (i=0; i<overlappingOverlaps.length; i++) {
                            overlapObj = this._getObjectFromId(overlappingOverlaps[i], this._overlaps);

                            // We will use this opportunity to remove members 
                            // that we find in these Overlap ojects from the
                            // overlappingItems array by pushing it into
                            // an array we will later use to filter them out.
                            // 
                            // The reason is we will be creating new Overlap
                            // objects with the remaining members, and we don't
                            // want to do that if these members are already
                            // part of an Overlap.

                            for (j=0; j<overlapObj.members.length; j++) {
                                if (overlappingItems.indexOf(overlapObj.members[j]) !== -1) {
                                    removeArray.push(overlapObj.members[j]);
                                }
                            }
                            overlapObj.addItem(newItem);
                        }

                    }

                    // Make sure to remove all instances of members in the 
                    // removeArray from the overlappingItems array before 
                    // processing to create new overlaps so that we know we're
                    // making new overlaps for virgin items
                    var filterFunc = function(el) {
                            return this[i] !== el;
                        };

                    for (i=0; i<removeArray.length; i++) {
                        overlappingItems = overlappingItems.filter(filterFunc, removeArray);
                    }

                    // Now that we have a sanitized array for overlappingItems,
                    // create new Overlap objects for each one.
                    for (i=0; i<overlappingItems.length; i++) {
                        itemObj = this._getObjectFromId(overlappingItems[i], this.items);
                        this._createNewOverlap.call(this, newItem, itemObj);
                    }

                    this.items.push(newItem);

                    // Need to update items with their new widthDividers
                    for (i=0; i<this.items.length; i++) {
                        this.items[i].widthDivider = this._findWidthDivider(this.items[i]);
                    }

                } else {
                    this.items.push(newItem);
                }

            };

            $scope.items = this.items;

            $scope.addItem = this.addItem;
            
            $scope.init = function(events) {
                var i = 0;

                // When this controller inits, add the items that have been
                // passed in to the calendar
                for (i=0; i<events.length; i++) {
                    this.addItem.call(controller, events[i]);
                }
            };

        }])

        /*
         * This controller is responsible for the logic behind creating the
         * timescale on the left. Instead of hard-coding it, I decided to make
         * it dynamic in case we wanted to change the start or end time of the
         * day, and if we want to change the interval length. Because the Item
         * inputs are all in minutes, we have a common unit to base the layout
         * on, making this a flexible mechanism.
         */

        .controller('ScaleCtrl', ['$scope', function($scope) {
            var controller = this;

            this.intervals = [];
            this.stripe = 'odd';

            /* 
             * Util function that switches off between even/odd, kept track by 
             * controller
             * @private
             */
            this._getStripe = function() {
                if (this.stripe === 'odd') {
                    this.stripe = 'even';
                    return 'odd';
                } else {
                    this.stripe = 'odd';
                    return 'even';
                }
            };

            /* 
             * Interval Class defines props for glorified date objects that
             * works with this app
             * @param start, end {Object} Object with time defined as minutes 
             * away from zero (midnight)
             */

            var Interval = function(start, end) {
                this._init.apply(this, arguments);
            };
            
            Interval.prototype._init = function(start, end) {
                var _startHour = Math.floor(start / 60),
                    _startMinute = start % 60,
                    _endHour = Math.floor(end / 60),
                    _endMinute = end % 60;

                this.displayHour = _startHour % 12; // Convert military-time hour to 1-12
                this.displayHour = 
                        this.displayHour === 0 ? 12 : this.displayHour; // Convert 0 to 12

                this.displayMinute = 
                        _startMinute < 10 ? '0' + 
                        _startMinute : _startMinute; // Add '0' to minutes less than 10

                this.length = (_endMinute + _endHour * 60) - 
                        (_startMinute + _startHour * 60); // Convert end hours and minutes
                                                          // to minutes as well as start
                                                          // and then get the difference to
                                                          // find the length of this interval

                this.stripe = controller._getStripe(); // Store whether this is an odd or even
                                                       // interval for styling purposes

                this.displayPeriod = _startHour < 12 ?  'AM' : 'PM'; // Determine whether this
                                                                     // is AM or PM based on
                                                                     // the start hour
                this.displayPeriod = this.stripe === 'odd'
                        ? this.displayPeriod : ''; // Remove the AM or PM if this is an even
                                                   // Interval (to match comp)

                this.displayStartTime = this.displayHour + ':' + this.displayMinute;

            };

            $scope.intervals = this.intervals;

            /* 
             * Init the time interval controller
             * @param start, end {Number} Start and end times in minutes from
             * midnight (eg, 540 = 900am)
             * @param interval {Number} Interval in minutes
             */
            $scope.init = function(start, end, interval) {
                var i = 0,
                    newInterval;

                // Loop through each and create the Interval objects to
                // create the timeline
                for (i=start; i<=end; i+=interval) {
                    newInterval = new Interval(i, i+interval);
                    this.intervals.push(newInterval);
                }

                // Set the height of the calendar to be the same height
                // as the timeline
                var calCtrlDiv = document.getElementById('calCtrl');
                calCtrlDiv.style.height = end - start + 'px';
            };

        }]);
    
})();

var layOutDays = function(events) {

    // If an array is not given, throw an error and return
    if (!events || !(Array.isArray(events))) {
        try {
            throw new Error("Expected an array.");
        } catch (e) {
            if (window.console && window.console.error) {
                console.error(e.name + ": " + e.message);
            }
        }
        return;
    }

    // Grab the scope & controller from the global scope and store a reference
    var controllerEl = document.getElementById('calCtrl'),
        scope = angular.element(controllerEl).scope(),
        controller = angular.element(controllerEl).controller(),
        i = 0;
    
    // For each given event, check to make sure that the end is greater than
    // the start. Won't do any further validation than this.
    for (i=0; i<events.length; i++) {
        if (events[i].start > events[i].end) {
            try {
                throw new Error("Event end must be greater than event start. Event starting at " + events[i].start + " and anding at " + events[i].end + " not added to calendar.");
            } catch (e) {
                if (window.console && window.console.error) {
                    console.error(e.name + ": " + e.message);
                }
            }
        } else {

            // If this looks good, pass it into the controller's addItem method
            // to add it to the calendar.
            scope.addItem.call(controller, events[i]);    
        }
    }

    // Update the DOM with the model change
    scope.$apply();

    // Return the updated model
    return scope.items;
};

var layOutDaysButton = function() {
    var start = document.getElementById('startMin').value;
    var end = document.getElementById('endMin').value;
    layOutDays([{start: start, end: end}]);
};