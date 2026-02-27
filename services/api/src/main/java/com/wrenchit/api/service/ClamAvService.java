package com.wrenchit.api.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class ClamAvService {

    private static final Logger log = LoggerFactory.getLogger(ClamAvService.class);

    @Value("${wrenchit.clamav.enabled:false}")
    private boolean enabled;

    @Value("${wrenchit.clamav.fail-closed:false}")
    private boolean failClosed;

    @Value("${wrenchit.clamav.host:localhost}")
    private String host;

    @Value("${wrenchit.clamav.port:3310}")
    private int port;

    public void assertClean(byte[] fileBytes) {
        if (!enabled || fileBytes == null || fileBytes.length == 0) {
            return;
        }

        try {
            scanStrict(fileBytes);
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode().value() == BAD_REQUEST.value() || failClosed) {
                throw ex;
            }
            log.warn("Skipping antivirus enforcement because scanner is unavailable: {}", ex.getReason());
        }
    }

    private void scanStrict(byte[] fileBytes) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 5000);
            socket.setSoTimeout(10000);

            try (OutputStream output = socket.getOutputStream();
                 InputStream input = socket.getInputStream()) {
                output.write("zINSTREAM\0".getBytes(StandardCharsets.US_ASCII));

                int offset = 0;
                while (offset < fileBytes.length) {
                    int chunkLength = Math.min(8192, fileBytes.length - offset);
                    writeChunkLength(output, chunkLength);
                    output.write(fileBytes, offset, chunkLength);
                    offset += chunkLength;
                }
                writeChunkLength(output, 0);
                output.flush();

                String response = readResponse(input);
                if (response == null || response.isBlank()) {
                    throw new ResponseStatusException(BAD_GATEWAY, "Antivirus scanner returned an empty response.");
                }
                if (response.contains("FOUND")) {
                    throw new ResponseStatusException(BAD_REQUEST, "Uploaded receipt file failed security scan.");
                }
                if (!response.contains("OK")) {
                    throw new ResponseStatusException(BAD_GATEWAY, "Unable to verify uploaded file safety.");
                }
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(BAD_GATEWAY, "Unable to reach antivirus scanner.");
        }
    }

    private void writeChunkLength(OutputStream output, int chunkLength) throws IOException {
        output.write((chunkLength >> 24) & 0xff);
        output.write((chunkLength >> 16) & 0xff);
        output.write((chunkLength >> 8) & 0xff);
        output.write(chunkLength & 0xff);
    }

    private String readResponse(InputStream input) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        int b;
        while ((b = input.read()) != -1) {
            if (b == '\n') {
                break;
            }
            buffer.write(b);
        }
        return buffer.toString(StandardCharsets.UTF_8).trim();
    }
}
