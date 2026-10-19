package com.achievee.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;

@SpringBootTest
class GatewayRoutesTest {

    @Autowired
    RouteLocator routes;

    @Test
    void routesEveryServiceFromConfig() {
        var ids = routes.getRoutes().map(Route::getId).collectList().block();
        assertThat(ids).containsExactlyInAnyOrder("expense-service", "stats-service");
    }
}
