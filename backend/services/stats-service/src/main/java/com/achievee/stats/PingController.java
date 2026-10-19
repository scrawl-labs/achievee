package com.achievee.stats;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 게이트웨이 라우팅 확인용. 실제 API가 생기면 지운다. */
@RestController
class PingController {

    private final String serviceName;

    PingController(@Value("${spring.application.name}") String serviceName) {
        this.serviceName = serviceName;
    }

    @GetMapping("/api/stats/ping")
    Map<String, String> ping() {
        return Map.of("service", serviceName);
    }
}
