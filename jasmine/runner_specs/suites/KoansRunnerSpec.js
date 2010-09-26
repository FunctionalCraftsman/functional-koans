describe("KoansRunner", function() {
  var env;
  var reporter;
  var body;
  var fakeDocument;

  beforeEach(function() {
    env = new jasmine.Env();
    env.updateInterval = 0;

    body = document.createElement("body");
    fakeDocument = { body: body, location: { search: "" } };
    reporter = new JsKoansReporter(fakeDocument);
  });

  function fakeSpec(name) {
    return {
      getFullName: function() {
        return name;
      }
    };
  }

  function findElements(divs, withClass) {
    var els = [];
    for (var i = 0; i < divs.length; i++) {
      if (divs[i].className == withClass) els.push(divs[i]);
    }
    return els;
  }

  function findElement(divs, withClass) {
    var els = findElements(divs, withClass);
    if (els.length > 0) return els[0];
    throw new Error("couldn't find div with class " + withClass);
  }

  it("should run only specs beginning with spec parameter", function() {
    fakeDocument.location.search = "?spec=run%20this";
    expect(reporter.specFilter(fakeSpec("run this"))).toBeTruthy();
    expect(reporter.specFilter(fakeSpec("not the right spec"))).toBeFalsy();
    expect(reporter.specFilter(fakeSpec("not run this"))).toBeFalsy();
  });

  it("should display empty divs for every suite when the runner is starting", function() {
    reporter.reportRunnerStarting({
      env: env,
      suites: function() {
        return [ new jasmine.Suite({}, "suite 1", null, null) ];
      }
    });

    var divs = findElements(body.getElementsByTagName("div"), "suite");
    expect(divs.length).toEqual(1);
    expect(divs[0].innerHTML).toContain("suite 1");
  });

  describe('Matcher reporting', function () {
    var getErrorMessageDiv = function (body) {
      var divs = body.getElementsByTagName("div");
      for (var i = 0; i < divs.length; i++) {
        if (divs[i].className.match(/errorMessage/)) {
          return divs[i];
        }
      }
    };

    var runner, spec, fakeTimer;
    beforeEach(function () {
      fakeTimer = new jasmine.FakeTimer();
      env.setTimeout = fakeTimer.setTimeout;
      env.clearTimeout = fakeTimer.clearTimeout;
      env.setInterval = fakeTimer.setInterval;
      env.clearInterval = fakeTimer.clearInterval;
      runner = env.currentRunner();
      var suite = new jasmine.Suite(env, 'some suite');
      runner.add(suite);
      spec = new jasmine.Spec(env, suite, 'some spec');
      suite.add(spec);
      fakeDocument.location.search = "?";
      env.addReporter(reporter);
    });

    describe('toContain', function () {
      it('should show actual and expected', function () {
        spec.runs(function () {
          this.expect('foo').toContain('bar');
        });
        runner.execute();
        fakeTimer.tick(0);

        var resultEl = getErrorMessageDiv(body);
        expect(resultEl.innerHTML).toMatch(/foo/);
        expect(resultEl.innerHTML).toMatch(/bar/);
      });
    });
  });


  describe("failure messages (integration)", function () {
    var spec, results, expectationResult;

    beforeEach(function() {
      results = {
        passed: function() {
          return false;
        },
        getItems: function() {
        }};

      var suite1 = new jasmine.Suite(env, "suite 1", null, null);

      spec = {
        suite: suite1,
        getFullName: function() {
          return "foo";
        },
        results: function() {
          return results;
        }
      };

      reporter.reportRunnerStarting({
        env: env,
        suites: function() {
          return [ suite1 ];
        }
      });
    });

    it("should add the failure message to the DOM (non-toEquals matchers)", function() {
      expectationResult = new jasmine.ExpectationResult({
        matcherName: "toBeNull", passed: false, message: "Expected 'a' to be null, but it was not"
      });

      spyOn(results, 'getItems').andReturn([expectationResult]);

      reporter.reportSpecResults(spec);

      var divs = body.getElementsByTagName("div");
      var errorDiv = findElement(divs, 'errorMessage');
      expect(errorDiv.innerHTML).toEqual("Expected 'a' to be null, but it was not");
    });

    it("should add the failure message to the DOM (non-toEquals matchers) html escaping", function() {
      expectationResult = new jasmine.ExpectationResult({
        matcherName: "toBeNull", passed: false, message: "Expected '1 < 2' to <b>e null, & it was not"
      });

      spyOn(results, 'getItems').andReturn([expectationResult]);

      reporter.reportSpecResults(spec);

      var divs = body.getElementsByTagName("div");
      var errorDiv = findElement(divs, 'errorMessage');
      expect(errorDiv.innerHTML).toEqual("Expected '1 &lt; 2' to &lt;b&gt;e null, &amp; it was not");
    });
  });

  describe("duplicate example names", function() {
    it("should report failures correctly", function() {
      var suite1 = env.describe("suite", function() {
        env.it("will have log messages", function() {
          this.log("this one passes!");
          this.expect(true).toBeTruthy();
        });
      });
      
      var suite2 = env.describe("suite", function() {
        env.it("will have log messages", function() {
          this.log("this one fails!");
          this.expect(true).toBeFalsy();
        });
      });

      env.addReporter(reporter);
      env.execute();

      var divs = body.getElementsByTagName("div");
      var failedSpecDiv = findElement(divs, 'suite failed');
      expect(failedSpecDiv.className).toEqual('suite failed');
      expect(failedSpecDiv.innerHTML).toContain("damaging your karma");
      expect(failedSpecDiv.innerHTML).not.toContain("has expanded your awareness");

      var passedSpecDiv = findElement(divs, 'suite passed');
      expect(passedSpecDiv.className).toEqual('suite passed');
      expect(passedSpecDiv.innerHTML).toContain("has expanded your awareness");
      expect(passedSpecDiv.innerHTML).not.toContain("damaging your karma");
    });
  });

  describe('#reportSpecStarting', function() {
    var spec1;
    beforeEach(function () {
      env.describe("suite 1", function() {
        spec1 = env.it("spec 1", function() {
        });
      });
    });

    it('DOES NOT log running specs by default', function() {
      spyOn(reporter, 'log');

      reporter.reportSpecStarting(spec1);

      expect(reporter.log).not.toHaveBeenCalled();
    });
  });
});
