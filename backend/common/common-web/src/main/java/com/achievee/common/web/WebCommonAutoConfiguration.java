package com.achievee.common.web;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Import;

/**
 * 서비스의 패키지(com.achievee.expense 등)는 이 라이브러리 패키지를 컴포넌트 스캔하지 않는다.
 * 의존성만 추가하면 자동으로 등록되도록 auto-configuration으로 노출한다.
 */
@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import(ApiExceptionHandler.class)
public class WebCommonAutoConfiguration {
}
