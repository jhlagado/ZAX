; ZAX lowered .asm trace
; range: $0100..$80A3 (end exclusive)

; func push_word begin
push_word:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push BC                        ; 0108: C5
push DE                        ; 0109: D5
push HL                        ; 010A: E5
ld A, (ix+$06)                 ; 010B: DD 7E 06
ld L, A                        ; 010E: 6F
ld E, (IX + $0008)             ; 010F: DD 5E 08
ld D, (IX + $0009)             ; 0112: DD 56 09
ld H, $0000                    ; 0115: 26 00
ld L, L                        ; 0117: 6D
add HL, HL                     ; 0118: 29
ex DE, HL                      ; 0119: EB
push DE                        ; 011A: D5
push IX                        ; 011B: DD E5
pop HL                         ; 011D: E1
ld DE, $0004                   ; 011E: 11 04 00
add HL, DE                     ; 0121: 19
pop DE                         ; 0122: D1
add HL, DE                     ; 0123: 19
push HL                        ; 0124: E5
pop HL                         ; 0125: E1
ld (HL), E                     ; 0126: 73
inc HL                         ; 0127: 23
ld (HL), D                     ; 0128: 72
ld A, (ix+$06)                 ; 0129: DD 7E 06
inc A                          ; 012C: 3C
__zax_epilogue_0:
pop HL                         ; 012D: E1
pop DE                         ; 012E: D1
pop BC                         ; 012F: C1
ld SP, IX                      ; 0130: DD F9
pop IX                         ; 0132: DD E1
ret                            ; 0134: C9
; func pop_word begin
; func push_word end
pop_word:
push IX                        ; 0135: DD E5
ld IX, $0000                   ; 0137: DD 21 00 00
add IX, SP                     ; 013B: DD 39
push BC                        ; 013D: C5
push DE                        ; 013E: D5
ld A, (ix+$06)                 ; 013F: DD 7E 06
dec A                          ; 0142: 3D
ld L, A                        ; 0143: 6F
ld H, $0000                    ; 0144: 26 00
ld L, L                        ; 0146: 6D
add HL, HL                     ; 0147: 29
ex DE, HL                      ; 0148: EB
push DE                        ; 0149: D5
push IX                        ; 014A: DD E5
pop HL                         ; 014C: E1
ld DE, $0004                   ; 014D: 11 04 00
add HL, DE                     ; 0150: 19
pop DE                         ; 0151: D1
add HL, DE                     ; 0152: 19
push HL                        ; 0153: E5
pop HL                         ; 0154: E1
ld E, (HL)                     ; 0155: 5E
inc HL                         ; 0156: 23
ld D, (HL)                     ; 0157: 56
ld E, E                        ; 0158: 5B
ld D, D                        ; 0159: 52
ex DE, HL                      ; 015A: EB
__zax_epilogue_1:
pop DE                         ; 015B: D1
pop BC                         ; 015C: C1
ld SP, IX                      ; 015D: DD F9
pop IX                         ; 015F: DD E1
ret                            ; 0161: C9
; func mul_u16 begin
; func pop_word end
mul_u16:
push IX                        ; 0162: DD E5
ld IX, $0000                   ; 0164: DD 21 00 00
add IX, SP                     ; 0168: DD 39
ld HL, $0000                   ; 016A: 21 00 00
push HL                        ; 016D: E5
ld HL, $0000                   ; 016E: 21 00 00
push HL                        ; 0171: E5
push AF                        ; 0172: F5
push BC                        ; 0173: C5
push DE                        ; 0174: D5
push DE                        ; 0175: D5
ld E, (IX + $0006)             ; 0176: DD 5E 06
ld D, (IX + $0007)             ; 0179: DD 56 07
ld (IX - $0004), E             ; 017C: DD 73 FC
ld (IX - $0003), D             ; 017F: DD 72 FD
pop DE                         ; 0182: D1
ld A, $0001                    ; 0183: 3E 01
or A                           ; 0185: B7
__zax_while_cond_3:
jp z, __zax_while_end_4        ; 0186: CA 00 00
ex DE, HL                      ; 0189: EB
ld E, (IX - $0004)             ; 018A: DD 5E FC
ld D, (IX - $0003)             ; 018D: DD 56 FD
ex DE, HL                      ; 0190: EB
ld A, H                        ; 0191: 7C
or L                           ; 0192: B5
jp nz, __zax_if_else_5         ; 0193: C2 00 00
ex DE, HL                      ; 0196: EB
ld E, (IX - $0002)             ; 0197: DD 5E FE
ld D, (IX - $0001)             ; 019A: DD 56 FF
ex DE, HL                      ; 019D: EB
jp __zax_epilogue_2            ; 019E: C3 00 00
__zax_if_else_5:
ex DE, HL                      ; 01A1: EB
ld E, (IX - $0002)             ; 01A2: DD 5E FE
ld D, (IX - $0001)             ; 01A5: DD 56 FF
ex DE, HL                      ; 01A8: EB
ld E, (IX + $0004)             ; 01A9: DD 5E 04
ld D, (IX + $0005)             ; 01AC: DD 56 05
add HL, DE                     ; 01AF: 19
ex DE, HL                      ; 01B0: EB
ld (IX - $0002), E             ; 01B1: DD 73 FE
ld (IX - $0001), D             ; 01B4: DD 72 FF
ex DE, HL                      ; 01B7: EB
push DE                        ; 01B8: D5
push BC                        ; 01B9: C5
push AF                        ; 01BA: F5
ld E, (IX - $0004)             ; 01BB: DD 5E FC
ld D, (IX - $0003)             ; 01BE: DD 56 FD
dec DE                         ; 01C1: 1B
ld (IX - $0004), E             ; 01C2: DD 73 FC
ld (IX - $0003), D             ; 01C5: DD 72 FD
ld A, D                        ; 01C8: 7A
or E                           ; 01C9: B3
pop BC                         ; 01CA: C1
ld A, B                        ; 01CB: 78
pop BC                         ; 01CC: C1
pop DE                         ; 01CD: D1
ld A, $0001                    ; 01CE: 3E 01
or A                           ; 01D0: B7
jp __zax_while_cond_3          ; 01D1: C3 00 00
__zax_while_end_4:
ex DE, HL                      ; 01D4: EB
ld E, (IX - $0002)             ; 01D5: DD 5E FE
ld D, (IX - $0001)             ; 01D8: DD 56 FF
ex DE, HL                      ; 01DB: EB
__zax_epilogue_2:
pop DE                         ; 01DC: D1
pop BC                         ; 01DD: C1
pop AF                         ; 01DE: F1
ld SP, IX                      ; 01DF: DD F9
pop IX                         ; 01E1: DD E1
ret                            ; 01E3: C9
; func mul_u16 end
; func rpn_demo begin
rpn_demo:
push IX                        ; 01E4: DD E5
ld IX, $0000                   ; 01E6: DD 21 00 00
add IX, SP                     ; 01EA: DD 39
ld HL, $0000                   ; 01EC: 21 00 00
push HL                        ; 01EF: E5
ld HL, $0000                   ; 01F0: 21 00 00
push HL                        ; 01F3: E5
ld HL, $0000                   ; 01F4: 21 00 00
push HL                        ; 01F7: E5
ld HL, $0000                   ; 01F8: 21 00 00
push HL                        ; 01FB: E5
push AF                        ; 01FC: F5
push BC                        ; 01FD: C5
push DE                        ; 01FE: D5
ld A, $0000                    ; 01FF: 3E 00
ld (stack_depth), A            ; 0201: 32 00 00
ld A, $0001                    ; 0204: 3E 01
or A                           ; 0206: B7
__zax_while_cond_8:
jp z, __zax_while_end_9        ; 0207: CA 00 00
ld A, (ix-$02)                 ; 020A: DD 7E FE
cp TokenCount                  ; 020D: FE 05
jp c, __zax_if_else_10         ; 020F: DA 00 00
ld A, (stack_depth)            ; 0212: 3A 00 00
ld H, $0000                    ; 0215: 26 00
ld L, A                        ; 0217: 6F
push HL                        ; 0218: E5
ld HL, value_stack             ; 0219: 21 00 00
push HL                        ; 021C: E5
call pop_word                  ; 021D: CD 00 00
inc SP                         ; 0220: 33
inc SP                         ; 0221: 33
inc SP                         ; 0222: 33
inc SP                         ; 0223: 33
ld (stack_depth), A            ; 0224: 32 00 00
jp __zax_epilogue_7            ; 0227: C3 00 00
__zax_if_else_10:
ex DE, HL                      ; 022A: EB
ld E, (IX - $0002)             ; 022B: DD 5E FE
ex DE, HL                      ; 022E: EB
push DE                        ; 022F: D5
push HL                        ; 0230: E5
ld de, token_kinds             ; 0231: 11 00 00
ld H, $0000                    ; 0234: 26 00
ld L, L                        ; 0236: 6D
add HL, DE                     ; 0237: 19
ld A, (HL)                     ; 0238: 7E
pop HL                         ; 0239: E1
pop DE                         ; 023A: D1
ld (ix-$04), A                 ; 023B: DD 77 FC
jp __zax_select_dispatch_12    ; 023E: C3 00 00
__zax_case_14:
ex DE, HL                      ; 0241: EB
ld E, (IX - $0002)             ; 0242: DD 5E FE
ex DE, HL                      ; 0245: EB
push DE                        ; 0246: D5
ld de, token_values            ; 0247: 11 00 00
ld H, $0000                    ; 024A: 26 00
ld L, L                        ; 024C: 6D
add HL, HL                     ; 024D: 29
add HL, DE                     ; 024E: 19
ld E, (HL)                     ; 024F: 5E
inc HL                         ; 0250: 23
ld D, (HL)                     ; 0251: 56
ld L, E                        ; 0252: 6B
ld H, D                        ; 0253: 62
pop DE                         ; 0254: D1
push HL                        ; 0255: E5
ld A, (stack_depth)            ; 0256: 3A 00 00
ld H, $0000                    ; 0259: 26 00
ld L, A                        ; 025B: 6F
push HL                        ; 025C: E5
ld HL, value_stack             ; 025D: 21 00 00
push HL                        ; 0260: E5
call push_word                 ; 0261: CD 00 00
inc SP                         ; 0264: 33
inc SP                         ; 0265: 33
inc SP                         ; 0266: 33
inc SP                         ; 0267: 33
inc SP                         ; 0268: 33
inc SP                         ; 0269: 33
ld (stack_depth), A            ; 026A: 32 00 00
jp __zax_select_end_13         ; 026D: C3 00 00
__zax_case_15:
ld A, (stack_depth)            ; 0270: 3A 00 00
ld H, $0000                    ; 0273: 26 00
ld L, A                        ; 0275: 6F
push HL                        ; 0276: E5
ld HL, value_stack             ; 0277: 21 00 00
push HL                        ; 027A: E5
call pop_word                  ; 027B: CD 00 00
inc SP                         ; 027E: 33
inc SP                         ; 027F: 33
inc SP                         ; 0280: 33
inc SP                         ; 0281: 33
ld (stack_depth), A            ; 0282: 32 00 00
ex DE, HL                      ; 0285: EB
ld (IX - $0006), E             ; 0286: DD 73 FA
ld (IX - $0005), D             ; 0289: DD 72 FB
ex DE, HL                      ; 028C: EB
ld A, (stack_depth)            ; 028D: 3A 00 00
ld H, $0000                    ; 0290: 26 00
ld L, A                        ; 0292: 6F
push HL                        ; 0293: E5
ld HL, value_stack             ; 0294: 21 00 00
push HL                        ; 0297: E5
call pop_word                  ; 0298: CD 00 00
inc SP                         ; 029B: 33
inc SP                         ; 029C: 33
inc SP                         ; 029D: 33
inc SP                         ; 029E: 33
ld (stack_depth), A            ; 029F: 32 00 00
ex DE, HL                      ; 02A2: EB
ld (IX - $0008), E             ; 02A3: DD 73 F8
ld (IX - $0007), D             ; 02A6: DD 72 F9
ex DE, HL                      ; 02A9: EB
ex DE, HL                      ; 02AA: EB
ld E, (IX - $0008)             ; 02AB: DD 5E F8
ld D, (IX - $0007)             ; 02AE: DD 56 F9
ex DE, HL                      ; 02B1: EB
ld E, (IX - $0006)             ; 02B2: DD 5E FA
ld D, (IX - $0005)             ; 02B5: DD 56 FB
add HL, DE                     ; 02B8: 19
push HL                        ; 02B9: E5
ld A, (stack_depth)            ; 02BA: 3A 00 00
ld H, $0000                    ; 02BD: 26 00
ld L, A                        ; 02BF: 6F
push HL                        ; 02C0: E5
ld HL, value_stack             ; 02C1: 21 00 00
push HL                        ; 02C4: E5
call push_word                 ; 02C5: CD 00 00
inc SP                         ; 02C8: 33
inc SP                         ; 02C9: 33
inc SP                         ; 02CA: 33
inc SP                         ; 02CB: 33
inc SP                         ; 02CC: 33
inc SP                         ; 02CD: 33
ld (stack_depth), A            ; 02CE: 32 00 00
jp __zax_select_end_13         ; 02D1: C3 00 00
__zax_case_16:
ld A, (stack_depth)            ; 02D4: 3A 00 00
ld H, $0000                    ; 02D7: 26 00
ld L, A                        ; 02D9: 6F
push HL                        ; 02DA: E5
ld HL, value_stack             ; 02DB: 21 00 00
push HL                        ; 02DE: E5
call pop_word                  ; 02DF: CD 00 00
inc SP                         ; 02E2: 33
inc SP                         ; 02E3: 33
inc SP                         ; 02E4: 33
inc SP                         ; 02E5: 33
ld (stack_depth), A            ; 02E6: 32 00 00
ex DE, HL                      ; 02E9: EB
ld (IX - $0006), E             ; 02EA: DD 73 FA
ld (IX - $0005), D             ; 02ED: DD 72 FB
ex DE, HL                      ; 02F0: EB
ld A, (stack_depth)            ; 02F1: 3A 00 00
ld H, $0000                    ; 02F4: 26 00
ld L, A                        ; 02F6: 6F
push HL                        ; 02F7: E5
ld HL, value_stack             ; 02F8: 21 00 00
push HL                        ; 02FB: E5
call pop_word                  ; 02FC: CD 00 00
inc SP                         ; 02FF: 33
inc SP                         ; 0300: 33
inc SP                         ; 0301: 33
inc SP                         ; 0302: 33
ld (stack_depth), A            ; 0303: 32 00 00
ex DE, HL                      ; 0306: EB
ld (IX - $0008), E             ; 0307: DD 73 F8
ld (IX - $0007), D             ; 030A: DD 72 F9
ex DE, HL                      ; 030D: EB
ex DE, HL                      ; 030E: EB
ld E, (IX - $0006)             ; 030F: DD 5E FA
ld D, (IX - $0005)             ; 0312: DD 56 FB
ex DE, HL                      ; 0315: EB
push HL                        ; 0316: E5
ex DE, HL                      ; 0317: EB
ld E, (IX - $0008)             ; 0318: DD 5E F8
ld D, (IX - $0007)             ; 031B: DD 56 F9
ex DE, HL                      ; 031E: EB
push HL                        ; 031F: E5
call mul_u16                   ; 0320: CD 00 00
inc SP                         ; 0323: 33
inc SP                         ; 0324: 33
inc SP                         ; 0325: 33
inc SP                         ; 0326: 33
push HL                        ; 0327: E5
ld A, (stack_depth)            ; 0328: 3A 00 00
ld H, $0000                    ; 032B: 26 00
ld L, A                        ; 032D: 6F
push HL                        ; 032E: E5
ld HL, value_stack             ; 032F: 21 00 00
push HL                        ; 0332: E5
call push_word                 ; 0333: CD 00 00
inc SP                         ; 0336: 33
inc SP                         ; 0337: 33
inc SP                         ; 0338: 33
inc SP                         ; 0339: 33
inc SP                         ; 033A: 33
inc SP                         ; 033B: 33
ld (stack_depth), A            ; 033C: 32 00 00
jp __zax_select_end_13         ; 033F: C3 00 00
__zax_select_dispatch_12:
push HL                        ; 0342: E5
ld H, $0000                    ; 0343: 26 00
ld L, A                        ; 0345: 6F
ld a, l                        ; 0346: 7D
cp imm8                        ; 0347: FE 00
jp nz, __zax_select_next_17    ; 0349: C2 00 00
pop HL                         ; 034C: E1
jp __zax_case_14               ; 034D: C3 00 00
__zax_select_next_17:
cp imm8                        ; 0350: FE 01
jp nz, __zax_select_next_18    ; 0352: C2 00 00
pop HL                         ; 0355: E1
jp __zax_case_15               ; 0356: C3 00 00
__zax_select_next_18:
cp imm8                        ; 0359: FE 02
jp nz, __zax_select_next_19    ; 035B: C2 00 00
pop HL                         ; 035E: E1
jp __zax_case_16               ; 035F: C3 00 00
__zax_select_next_19:
pop HL                         ; 0362: E1
jp __zax_select_end_13         ; 0363: C3 00 00
__zax_select_end_13:
push DE                        ; 0366: D5
ld E, (IX - $0002)             ; 0367: DD 5E FE
inc E                          ; 036A: 1C
ld (IX - $0002), E             ; 036B: DD 73 FE
pop DE                         ; 036E: D1
ld A, $0001                    ; 036F: 3E 01
or A                           ; 0371: B7
jp __zax_while_cond_8          ; 0372: C3 00 00
__zax_while_end_9:
ld A, (stack_depth)            ; 0375: 3A 00 00
ld H, $0000                    ; 0378: 26 00
ld L, A                        ; 037A: 6F
push HL                        ; 037B: E5
ld HL, value_stack             ; 037C: 21 00 00
push HL                        ; 037F: E5
call pop_word                  ; 0380: CD 00 00
inc SP                         ; 0383: 33
inc SP                         ; 0384: 33
inc SP                         ; 0385: 33
inc SP                         ; 0386: 33
ld (stack_depth), A            ; 0387: 32 00 00
__zax_epilogue_7:
pop DE                         ; 038A: D1
pop BC                         ; 038B: C1
pop AF                         ; 038C: F1
ld SP, IX                      ; 038D: DD F9
pop IX                         ; 038F: DD E1
ret                            ; 0391: C9
; func main begin
; func rpn_demo end
main:
push IX                        ; 0392: DD E5
ld IX, $0000                   ; 0394: DD 21 00 00
add IX, SP                     ; 0398: DD 39
push AF                        ; 039A: F5
push BC                        ; 039B: C5
push DE                        ; 039C: D5
push HL                        ; 039D: E5
call rpn_demo                  ; 039E: CD 00 00
__zax_epilogue_20:
pop HL                         ; 03A1: E1
pop DE                         ; 03A2: D1
pop BC                         ; 03A3: C1
pop AF                         ; 03A4: F1
ld SP, IX                      ; 03A5: DD F9
pop IX                         ; 03A7: DD E1
ret                            ; 03A9: C9
; func main end

; symbols:
; label push_word = $0100
; label __zax_epilogue_0 = $012D
; label pop_word = $0135
; label __zax_epilogue_1 = $015B
; label mul_u16 = $0162
; label __zax_while_cond_3 = $0186
; label __zax_if_else_5 = $01A1
; label __zax_while_end_4 = $01D4
; label __zax_epilogue_2 = $01DC
; label rpn_demo = $01E4
; label __zax_while_cond_8 = $0207
; label __zax_if_else_10 = $022A
; label __zax_case_14 = $0241
; label __zax_case_15 = $0270
; label __zax_case_16 = $02D4
; label __zax_select_dispatch_12 = $0342
; label __zax_select_next_17 = $0350
; label __zax_select_next_18 = $0359
; label __zax_select_next_19 = $0362
; label __zax_select_end_13 = $0366
; label __zax_while_end_9 = $0375
; label __zax_epilogue_7 = $038A
; label main = $0392
; label __zax_epilogue_20 = $03A1
; data token_kinds = $8000
; data token_values = $8005
; data value_stack = $800F
; data stack_depth = $801F
; label __zax_startup = $8020
; constant TokenCount = $0005 (5)
; constant TokenKind.Add = $0001 (1)
; constant TokenKind.Multiply = $0002 (2)
; constant TokenKind.Number = $0000 (0)
