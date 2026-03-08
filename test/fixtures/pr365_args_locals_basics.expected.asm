; ZAX lowered .asm trace
; range: $0000..$00A7 (end exclusive)

; func add_words begin
add_words:
push IX                        ; 0000: DD E5
ld IX, $0000                   ; 0002: DD 21 00 00
add IX, SP                     ; 0006: DD 39
push AF                        ; 0008: F5
push BC                        ; 0009: C5
push DE                        ; 000A: D5
ex DE, HL                      ; 000B: EB
ld E, (IX + $0004)             ; 000C: DD 5E 04
ld D, (IX + $0005)             ; 000F: DD 56 05
ex DE, HL                      ; 0012: EB
ld E, (IX + $0006)             ; 0013: DD 5E 06
ld D, (IX + $0007)             ; 0016: DD 56 07
add HL, DE                     ; 0019: 19
__zax_epilogue_0:
pop DE                         ; 001A: D1
pop BC                         ; 001B: C1
pop AF                         ; 001C: F1
ld SP, IX                      ; 001D: DD F9
pop IX                         ; 001F: DD E1
ret                            ; 0021: C9
; func add_words end
; func bump_byte begin
bump_byte:
push IX                        ; 0022: DD E5
ld IX, $0000                   ; 0024: DD 21 00 00
add IX, SP                     ; 0028: DD 39
ld HL, $0000                   ; 002A: 21 00 00
push HL                        ; 002D: E5
push AF                        ; 002E: F5
push BC                        ; 002F: C5
push DE                        ; 0030: D5
ex DE, HL                      ; 0031: EB
ld E, (IX + $0004)             ; 0032: DD 5E 04
ex DE, HL                      ; 0035: EB
ld H, $0000                    ; 0036: 26 00
inc L                          ; 0038: 2C
push DE                        ; 0039: D5
ex DE, HL                      ; 003A: EB
push AF                        ; 003B: F5
push BC                        ; 003C: C5
push DE                        ; 003D: D5
push IX                        ; 003E: DD E5
pop HL                         ; 0040: E1
ld DE, $FFFE                   ; 0041: 11 FE FF
add HL, DE                     ; 0044: 19
push HL                        ; 0045: E5
pop HL                         ; 0046: E1
pop DE                         ; 0047: D1
pop BC                         ; 0048: C1
pop AF                         ; 0049: F1
ld (hl), E                     ; 004A: 73
inc HL                         ; 004B: 23
ld (hl), D                     ; 004C: 72
ex DE, HL                      ; 004D: EB
pop DE                         ; 004E: D1
ex DE, HL                      ; 004F: EB
ld E, (IX - $0002)             ; 0050: DD 5E FE
ld D, (IX - $0001)             ; 0053: DD 56 FF
ex DE, HL                      ; 0056: EB
__zax_epilogue_1:
pop DE                         ; 0057: D1
pop BC                         ; 0058: C1
pop AF                         ; 0059: F1
ld SP, IX                      ; 005A: DD F9
pop IX                         ; 005C: DD E1
ret                            ; 005E: C9
; func bump_byte end
; func main begin
main:
push IX                        ; 005F: DD E5
ld IX, $0000                   ; 0061: DD 21 00 00
add IX, SP                     ; 0065: DD 39
push HL                        ; 0067: E5
ld HL, $0000                   ; 0068: 21 00 00
ex (SP), HL                    ; 006B: E3
push AF                        ; 006C: F5
push BC                        ; 006D: C5
push DE                        ; 006E: D5
push HL                        ; 006F: E5
ld HL, $0014                   ; 0070: 21 14 00
push HL                        ; 0073: E5
ld HL, $000A                   ; 0074: 21 0A 00
push HL                        ; 0077: E5
call add_words                 ; 0078: CD 00 00
inc SP                         ; 007B: 33
inc SP                         ; 007C: 33
inc SP                         ; 007D: 33
inc SP                         ; 007E: 33
push DE                        ; 007F: D5
ex DE, HL                      ; 0080: EB
push AF                        ; 0081: F5
push BC                        ; 0082: C5
push DE                        ; 0083: D5
push IX                        ; 0084: DD E5
pop HL                         ; 0086: E1
ld DE, $FFFE                   ; 0087: 11 FE FF
add HL, DE                     ; 008A: 19
push HL                        ; 008B: E5
pop HL                         ; 008C: E1
pop DE                         ; 008D: D1
pop BC                         ; 008E: C1
pop AF                         ; 008F: F1
ld (hl), E                     ; 0090: 73
inc HL                         ; 0091: 23
ld (hl), D                     ; 0092: 72
ex DE, HL                      ; 0093: EB
pop DE                         ; 0094: D1
ld HL, $0007                   ; 0095: 21 07 00
push HL                        ; 0098: E5
call bump_byte                 ; 0099: CD 00 00
inc SP                         ; 009C: 33
inc SP                         ; 009D: 33
__zax_epilogue_2:
pop HL                         ; 009E: E1
pop DE                         ; 009F: D1
pop BC                         ; 00A0: C1
pop AF                         ; 00A1: F1
ld SP, IX                      ; 00A2: DD F9
pop IX                         ; 00A4: DD E1
ret                            ; 00A6: C9
; func main end

; symbols:
; label add_words = $0000
; label __zax_epilogue_0 = $001A
; label bump_byte = $0022
; label __zax_epilogue_1 = $0057
; label main = $005F
; label __zax_epilogue_2 = $009E
