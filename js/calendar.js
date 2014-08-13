(function() {
    var items = [];

    angular.module('jCal', [])

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
             * @param overlapArray {Array} takes array of either Item or Overlap objects
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

                    if ((diffStarts + diffEnds) <= (lengthItem + lengthCompare)) {
                        output.push(overlapArray[i].id);
                    }
                }

                return output;
            };

            /* 
             * Returns an object containing the start and end time of an overlap
             * @private
             * @param item1, item2 {Object} takes Item object
             * @return {Object} start and end time of the overlap
             */

            this._calculateOverlap = function(item1, item2) {
                var starts = [],
                    ends = [];
                starts.push(item1.start, item2.start);
                ends.push(item1.end, item2.end);

                var start = Math.max.apply(null, starts);
                var end = Math.min.apply(null, ends);

                return { start: start, end: end };

            };

            /* 
             * Determines width of item based on stored overlap information such that
             * any two items that collide in time should have the same width
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
             * @param start {String} Numeric string indicating start time as difference from calendar start
             * @param end {String} Numeric string indicating start time as difference from calendar start
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
             * Overlap class defines properties and methods of an overlap between two Items
             * @param start {String} Numeric string indicating start time of overlap as difference from 
             * calendar start
             * @param end {String} Numeric string indicating start time of overlapas difference from
             * calendar start
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
                this.memberCount = 0;
                this.memberPositions = {};
            };

            /* 
             * Adds an item as a member of this Overlap, updates overlap and item properties
             * @param item {Object} Item instance
             */

            Overlap.prototype.addItem = function(item) {
                // Check through member positions and fill the first non-empty one
                var i = 0,
                    j = 0,
                    overlapPosition = 0;

                if (!item.positionLocked) {

                    i = 1;
                    while (this.memberPositions[i]) {
                        i++;
                    }

                    overlapPosition = i;

                    if (overlapPosition >= 1) {
                        item.position = overlapPosition;
                        item.positionLocked = true;
                    }
                }
                
                if (this.members.indexOf(item.id) === -1) {
                    this.members.push(item.id);
                }
                this.memberPositions[item.position] = item.id;
                item.overlap.push(this.id);
            };

            /* 
             * Given two items, create a new Overlap object; this contains the only means of
             * constructing new Overlap instance
             * @private
             * @param item1, item2 {Object} Item instance
             */

            this._createNewOverlap = function(item1, item2) {
                var overlapInfo = this._calculateOverlap(item1, item2),
                    i = 0,
                    overlaps = this._overlaps;
                
                // Check to see if this overlap already exists. If it does, just add these items to
                // the overlap that exists. Otherwise, create a new one and add these items to it.
                for (i=0; i<overlaps.length; i++) {
                    if ((overlaps[i].start === overlapInfo.start) && (overlaps[i].end === overlapInfo.end)) {
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
             * Constructs and adds an Item object to the items array and update Overlaps and existing Item 
             * properties
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

                        // We want to sort this in order of overlaps that have the most members
                        // first, to avoid items which are members of many overlaps being locked
                        // into too low a position
                        
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

                        for (i=0; i<overlappingOverlaps.length; i++) {
                            overlapObj = this._getObjectFromId(overlappingOverlaps[i], this._overlaps);
                            sortedOverlaps.push(overlapObj);
                        }

                        sortedOverlaps.sort(_compareFunction);
                        overlappingOverlaps.length = 0;

                        for (i=0; i<sortedOverlaps.length; i++) {
                            overlappingOverlaps.push(sortedOverlaps[i].id);
                        }

                        overlappingOverlaps.reverse();

                        // This updates the Overlap objects with this new member
                        for (i=0; i<overlappingOverlaps.length; i++) {
                            overlapObj = this._getObjectFromId(overlappingOverlaps[i], this._overlaps);

                            // Make sure to remove members of these overlaps from overlappingItems 
                            // array so we don't create a new overlap unnecessarily; this surgery gets
                            // intense when we have a ton of events
                            for (j=0; j<overlapObj.members.length; j++) {
                                if (overlappingItems.indexOf(overlapObj.members[j]) !== -1) {
                                    removeArray.push(overlapObj.members[j]);
                                }
                            }
                            overlapObj.addItem(newItem);
                        }

                    }

                    // Make sure to remove all instances of members in the removeArray from the
                    // overlappingItems array before processing to create new overlaps so that
                    // we know we're making new overlaps for virgin items
                    var filterFunc = function(el) {
                            return this[i] !== el;
                        };

                    for (i=0; i<removeArray.length; i++) {
                        overlappingItems = overlappingItems.filter(filterFunc, removeArray);
                    }

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
            
            $scope.init = function() {
                var startingEvents = [ {start: 30, end: 150}, {start: 540, end: 600}, {start: 560, end: 620}, {start: 610, end: 670} ],
                    i = 0,
                    controllerEl = document.getElementById('calCtrl'),
                    controller = angular.element(controllerEl).controller();

                for (i=0; i<startingEvents.length; i++) {
                    this.addItem.call(controller, startingEvents[i]);
                }
            };

        }])

        .controller('ScaleCtrl', ['$scope', function($scope) {
            var controller = this;

            this.intervals = [];
            this.stripe = 'odd';

            /* 
             * Util function that switches off between even/odd, kept track by controller
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
             * Interval Class defines props for glorified date objects that works with this app
             * @param start, end {Object} Object with time defined as minutes away from zero (midnight)
             */

            var Interval = function(start, end) {
                this._init.apply(this, arguments);
            };
            
            Interval.prototype._init = function(start, end) {
                var _startHour = Math.floor(start / 60),
                    _startMinute = start % 60,
                    _endHour = Math.floor(end / 60),
                    _endMinute = end % 60;

                this.displayHour = _startHour % 12;
                this.displayHour = this.displayHour === 0 ? 12 : this.displayHour;
                this.displayMinute = _startMinute < 10 ? '0' + _startMinute : _startMinute;
                this.length = (_endMinute + _endHour * 60) - (_startMinute + _startHour * 60);
                this.stripe = controller._getStripe();
                this.displayPeriod = _startHour < 12 ?  'AM' : 'PM';
                this.displayPeriod = this.stripe === 'odd' ? this.displayPeriod : '';
                this.displayStartTime = this.displayHour + ':' + this.displayMinute;
            };

            $scope.intervals = this.intervals;

            /* 
             * Init the time interval controller
             * @param start, end {Number} Start and end times in minutes from midnight (eg, 540 = 900am)
             * @param interval {Number} Interval in minutes
             */
            $scope.init = function(start, end, interval) {
                var i = 0,
                    newInterval;
                for (i=start; i<=end; i+=interval) {
                    newInterval = new Interval(i, i+interval);
                    this.intervals.push(newInterval);
                }
            };

        }]);
    
})();

var layOutDays = function(events) {

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

    var controllerEl = document.getElementById('calCtrl');
    var scope = angular.element(controllerEl).scope();
    var controller = angular.element(controllerEl).controller();
    var i = 0;
    
    for (i=0; i<events.length; i++) {
        if (events[i].start > events[i].end) {
            try {
                throw new Error("Event end must be greater than event start.");
            } catch (e) {
                if (window.console && window.console.error) {
                    console.error(e.name + ": " + e.message);
                }
            }
            return;
        }
        scope.addItem.call(controller, events[i]);
    }
    scope.$apply();
    return scope.items;
};

var layOutDaysButton = function() {
    var start = document.getElementById('startMin').value;
    var end = document.getElementById('endMin').value;
    layOutDays([{start: start, end: end}]);
};