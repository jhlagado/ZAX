; ZAX lowered .asm trace
; range: $0100..$0184 (end exclusive)

; func add_words begin
add_words:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld L, (IX + $0004)             ; 010B: DD 6E 04
ld H, (IX + $0005)             ; 010E: DD 66 05
ld E, (IX + $0006)             ; 0111: DD 5E 06
ld D, (IX + $0007)             ; 0114: DD 56 07
add HL, DE                     ; 0117: 19
__zax_epilogue_0:
pop DE                         ; 0118: D1
pop BC                         ; 0119: C1
pop AF                         ; 011A: F1
ld SP, IX                      ; 011B: DD F9
pop IX                         ; 011D: DD E1
ret                            ; 011F: C9
; func add_words end
; func bump_byte begin
bump_byte:
push IX                        ; 0120: DD E5
ld IX, $0000                   ; 0122: DD 21 00 00
add IX, SP                     ; 0126: DD 39
ld HL, $0000                   ; 0128: 21 00 00
push HL                        ; 012B: E5
push AF                        ; 012C: F5
push BC                        ; 012D: C5
push DE                        ; 012E: D5
push DE                        ; 012F: D5
ld E, (IX + $0004)             ; 0130: DD 5E 04
ld L, E                        ; 0133: 6B
pop DE                         ; 0134: D1
ld H, $0000                    ; 0135: 26 00
inc L                          ; 0137: 2C
ld (IX - $0002), L             ; 0138: DD 75 FE
ld (IX - $0001), H             ; 013B: DD 74 FF
ld L, (IX - $0002)             ; 013E: DD 6E FE
ld H, (IX - $0001)             ; 0141: DD 66 FF
__zax_epilogue_1:
pop DE                         ; 0144: D1
pop BC                         ; 0145: C1
pop AF                         ; 0146: F1
ld SP, IX                      ; 0147: DD F9
pop IX                         ; 0149: DD E1
ret                            ; 014B: C9
; func bump_byte end
; func main begin
main:
push IX                        ; 014C: DD E5
ld IX, $0000                   ; 014E: DD 21 00 00
add IX, SP                     ; 0152: DD 39
push HL                        ; 0154: E5
ld HL, $0000                   ; 0155: 21 00 00
ex (SP), HL                    ; 0158: E3
push AF                        ; 0159: F5
push BC                        ; 015A: C5
push DE                        ; 015B: D5
push HL                        ; 015C: E5
ld HL, $0014                   ; 015D: 21 14 00
push HL                        ; 0160: E5
ld HL, $000A                   ; 0161: 21 0A 00
push HL                        ; 0164: E5
call add_words                 ; 0165: CD 00 00
inc SP                         ; 0168: 33
inc SP                         ; 0169: 33
inc SP                         ; 016A: 33
inc SP                         ; 016B: 33
ld (IX - $0002), L             ; 016C: DD 75 FE
ld (IX - $0001), H             ; 016F: DD 74 FF
ld HL, $0007                   ; 0172: 21 07 00
push HL                        ; 0175: E5
call bump_byte                 ; 0176: CD 00 00
inc SP                         ; 0179: 33
inc SP                         ; 017A: 33
__zax_epilogue_2:
pop HL                         ; 017B: E1
pop DE                         ; 017C: D1
pop BC                         ; 017D: C1
pop AF                         ; 017E: F1
ld SP, IX                      ; 017F: DD F9
pop IX                         ; 0181: DD E1
ret                            ; 0183: C9
; func main end

; symbols:
; label add_words = $0100
; label __zax_epilogue_0 = $0118
; label bump_byte = $0120
; label __zax_epilogue_1 = $0144
; label main = $014C
; label __zax_epilogue_2 = $017B
