; ZAX lowered .asm trace
; range: $0100..$01F1 (end exclusive)

; func fib begin
fib:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
ld HL, $0000                   ; 0108: 21 00 00
push HL                        ; 010B: E5
ld HL, $0001                   ; 010C: 21 01 00
push HL                        ; 010F: E5
ld HL, $0000                   ; 0110: 21 00 00
push HL                        ; 0113: E5
ld HL, $0000                   ; 0114: 21 00 00
push HL                        ; 0117: E5
push AF                        ; 0118: F5
push BC                        ; 0119: C5
push DE                        ; 011A: D5
__zax_while_cond_1:
jp z, __zax_while_end_2        ; 011B: CA 00 00
ex DE, HL                      ; 011E: EB
ld E, (IX - $0006)             ; 011F: DD 5E FA
ld D, (IX - $0005)             ; 0122: DD 56 FB
ex DE, HL                      ; 0125: EB
ld E, (IX + $0004)             ; 0126: DD 5E 04
ld D, (IX + $0005)             ; 0129: DD 56 05
xor A                          ; 012C: AF
sbc HL, DE                     ; 012D: ED 52
jp nz, __zax_if_else_3         ; 012F: C2 00 00
ex DE, HL                      ; 0132: EB
ld E, (IX - $0002)             ; 0133: DD 5E FE
ld D, (IX - $0001)             ; 0136: DD 56 FF
ex DE, HL                      ; 0139: EB
jp __zax_epilogue_0            ; 013A: C3 00 00
__zax_if_else_3:
ex DE, HL                      ; 013D: EB
ld E, (IX - $0002)             ; 013E: DD 5E FE
ld D, (IX - $0001)             ; 0141: DD 56 FF
ex DE, HL                      ; 0144: EB
ld E, (IX - $0004)             ; 0145: DD 5E FC
ld D, (IX - $0003)             ; 0148: DD 56 FD
add HL, DE                     ; 014B: 19
push DE                        ; 014C: D5
ex DE, HL                      ; 014D: EB
push AF                        ; 014E: F5
push BC                        ; 014F: C5
push DE                        ; 0150: D5
push IX                        ; 0151: DD E5
pop HL                         ; 0153: E1
ld DE, $FFF8                   ; 0154: 11 F8 FF
add HL, DE                     ; 0157: 19
push HL                        ; 0158: E5
pop HL                         ; 0159: E1
pop DE                         ; 015A: D1
pop BC                         ; 015B: C1
pop AF                         ; 015C: F1
ld (hl), E                     ; 015D: 73
inc HL                         ; 015E: 23
ld (hl), D                     ; 015F: 72
ex DE, HL                      ; 0160: EB
pop DE                         ; 0161: D1
ex DE, HL                      ; 0162: EB
ld E, (IX - $0004)             ; 0163: DD 5E FC
ld D, (IX - $0003)             ; 0166: DD 56 FD
ex DE, HL                      ; 0169: EB
push DE                        ; 016A: D5
ex DE, HL                      ; 016B: EB
push AF                        ; 016C: F5
push BC                        ; 016D: C5
push DE                        ; 016E: D5
push IX                        ; 016F: DD E5
pop HL                         ; 0171: E1
ld DE, $FFFE                   ; 0172: 11 FE FF
add HL, DE                     ; 0175: 19
push HL                        ; 0176: E5
pop HL                         ; 0177: E1
pop DE                         ; 0178: D1
pop BC                         ; 0179: C1
pop AF                         ; 017A: F1
ld (hl), E                     ; 017B: 73
inc HL                         ; 017C: 23
ld (hl), D                     ; 017D: 72
ex DE, HL                      ; 017E: EB
pop DE                         ; 017F: D1
ex DE, HL                      ; 0180: EB
ld E, (IX - $0008)             ; 0181: DD 5E F8
ld D, (IX - $0007)             ; 0184: DD 56 F9
ex DE, HL                      ; 0187: EB
push DE                        ; 0188: D5
ex DE, HL                      ; 0189: EB
push AF                        ; 018A: F5
push BC                        ; 018B: C5
push DE                        ; 018C: D5
push IX                        ; 018D: DD E5
pop HL                         ; 018F: E1
ld DE, $FFFC                   ; 0190: 11 FC FF
add HL, DE                     ; 0193: 19
push HL                        ; 0194: E5
pop HL                         ; 0195: E1
pop DE                         ; 0196: D1
pop BC                         ; 0197: C1
pop AF                         ; 0198: F1
ld (hl), E                     ; 0199: 73
inc HL                         ; 019A: 23
ld (hl), D                     ; 019B: 72
ex DE, HL                      ; 019C: EB
pop DE                         ; 019D: D1
ex DE, HL                      ; 019E: EB
ld E, (IX - $0006)             ; 019F: DD 5E FA
ld D, (IX - $0005)             ; 01A2: DD 56 FB
ex DE, HL                      ; 01A5: EB
inc HL                         ; 01A6: 23
push DE                        ; 01A7: D5
ex DE, HL                      ; 01A8: EB
push AF                        ; 01A9: F5
push BC                        ; 01AA: C5
push DE                        ; 01AB: D5
push IX                        ; 01AC: DD E5
pop HL                         ; 01AE: E1
ld DE, $FFFA                   ; 01AF: 11 FA FF
add HL, DE                     ; 01B2: 19
push HL                        ; 01B3: E5
pop HL                         ; 01B4: E1
pop DE                         ; 01B5: D1
pop BC                         ; 01B6: C1
pop AF                         ; 01B7: F1
ld (hl), E                     ; 01B8: 73
inc HL                         ; 01B9: 23
ld (hl), D                     ; 01BA: 72
ex DE, HL                      ; 01BB: EB
pop DE                         ; 01BC: D1
ld A, $0001                    ; 01BD: 3E 01
or A                           ; 01BF: B7
jp __zax_while_cond_1          ; 01C0: C3 00 00
__zax_while_end_2:
ex DE, HL                      ; 01C3: EB
ld E, (IX - $0002)             ; 01C4: DD 5E FE
ld D, (IX - $0001)             ; 01C7: DD 56 FF
ex DE, HL                      ; 01CA: EB
__zax_epilogue_0:
pop DE                         ; 01CB: D1
pop BC                         ; 01CC: C1
pop AF                         ; 01CD: F1
ld SP, IX                      ; 01CE: DD F9
pop IX                         ; 01D0: DD E1
ret                            ; 01D2: C9
; func fib end
; func main begin
main:
push IX                        ; 01D3: DD E5
ld IX, $0000                   ; 01D5: DD 21 00 00
add IX, SP                     ; 01D9: DD 39
push AF                        ; 01DB: F5
push BC                        ; 01DC: C5
push DE                        ; 01DD: D5
push HL                        ; 01DE: E5
ld HL, $000A                   ; 01DF: 21 0A 00
push HL                        ; 01E2: E5
call fib                       ; 01E3: CD 00 00
inc SP                         ; 01E6: 33
inc SP                         ; 01E7: 33
__zax_epilogue_5:
pop HL                         ; 01E8: E1
pop DE                         ; 01E9: D1
pop BC                         ; 01EA: C1
pop AF                         ; 01EB: F1
ld SP, IX                      ; 01EC: DD F9
pop IX                         ; 01EE: DD E1
ret                            ; 01F0: C9
; func main end

; symbols:
; label fib = $0100
; label __zax_while_cond_1 = $011B
; label __zax_if_else_3 = $013D
; label __zax_while_end_2 = $01C3
; label __zax_epilogue_0 = $01CB
; label main = $01D3
; label __zax_epilogue_5 = $01E8
